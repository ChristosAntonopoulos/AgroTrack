using System.Threading.Channels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Infrastructure.Geospatial.Jobs;

/// <summary>
/// In-process work queue for geospatial processing. Jobs are recorded in MongoDB with an
/// idempotency key so a repeated enqueue (or a restart) cannot produce duplicate work.
/// </summary>
public class GeospatialJobQueue : IGeospatialJobQueue
{
    private readonly Channel<SpatialProfileWorkItem> _spatialProfileChannel =
        Channel.CreateUnbounded<SpatialProfileWorkItem>();

    private readonly Channel<SatelliteWorkItem> _satelliteChannel =
        Channel.CreateUnbounded<SatelliteWorkItem>();

    private readonly Channel<TaskConditionWorkItem> _taskConditionChannel =
        Channel.CreateUnbounded<TaskConditionWorkItem>();

    private readonly Channel<FieldHistoryWorkItem> _fieldHistoryChannel =
        Channel.CreateUnbounded<FieldHistoryWorkItem>();

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GeospatialJobQueue> _logger;

    public GeospatialJobQueue(IServiceScopeFactory scopeFactory, ILogger<GeospatialJobQueue> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public ChannelReader<SpatialProfileWorkItem> SpatialProfileReader => _spatialProfileChannel.Reader;
    public ChannelReader<SatelliteWorkItem> SatelliteReader => _satelliteChannel.Reader;
    public ChannelReader<TaskConditionWorkItem> TaskConditionReader => _taskConditionChannel.Reader;
    public ChannelReader<FieldHistoryWorkItem> FieldHistoryReader => _fieldHistoryChannel.Reader;

    public async Task EnqueueSpatialProfileAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var key = $"spatial_{fieldId}_{DateTime.UtcNow:yyyyMMddHH}";
        var job = await TryRecordJobAsync(fieldId, "SpatialProfile", key, cancellationToken);
        if (job == null) return;
        await _spatialProfileChannel.Writer.WriteAsync(new SpatialProfileWorkItem(fieldId, job.Id), cancellationToken);
    }

    public async Task EnqueueSatelliteProcessingAsync(string fieldId, string? catalogItemId = null, CancellationToken cancellationToken = default)
    {
        var key = $"satellite_{fieldId}_{catalogItemId ?? DateTime.UtcNow.ToString("yyyyMMdd")}";
        var job = await TryRecordJobAsync(fieldId, "SatelliteProcessing", key, cancellationToken);
        if (job == null) return;
        await _satelliteChannel.Writer.WriteAsync(new SatelliteWorkItem(fieldId, catalogItemId, job.Id), cancellationToken);
    }

    public async Task EnqueueTaskConditionsAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        // Every enqueue re-evaluates all upcoming tasks on the field, so collapsing
        // repeated requests within the same minute costs nothing.
        var key = $"taskconditions_{fieldId}_{DateTime.UtcNow:yyyyMMddHHmm}";
        var job = await TryRecordJobAsync(fieldId, "TaskConditions", key, cancellationToken);
        if (job == null) return;
        await _taskConditionChannel.Writer.WriteAsync(new TaskConditionWorkItem(fieldId, job.Id), cancellationToken);
    }

    public async Task EnqueueFieldHistoryBackfillAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        // One key per field so redrawing the boundary or re-activating cannot
        // launch a second multi-year download.
        var key = $"fieldhistory_{fieldId}";
        var job = await TryRecordJobAsync(fieldId, "FieldHistoryBackfill", key, cancellationToken);
        if (job == null) return;
        await _fieldHistoryChannel.Writer.WriteAsync(new FieldHistoryWorkItem(fieldId, job.Id), cancellationToken);
    }

    private async Task<GeospatialProcessingJob?> TryRecordJobAsync(string fieldId, string jobType, string idempotencyKey, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IGeospatialProcessingJobRepository>();

        var existing = await repository.GetByIdempotencyKeyAsync(idempotencyKey, ct);
        if (existing != null && existing.Status != GeospatialProcessingStatus.Failed)
        {
            _logger.LogDebug("Skipping duplicate {JobType} enqueue for field {FieldId}", jobType, fieldId);
            return null;
        }

        if (existing != null)
        {
            existing.Status = GeospatialProcessingStatus.Pending;
            existing.Attempts++;
            existing.UpdatedAt = DateTime.UtcNow;
            await repository.UpdateAsync(existing, ct);
            return existing;
        }

        var job = new GeospatialProcessingJob
        {
            Id = Guid.NewGuid().ToString("N"),
            FieldId = fieldId,
            JobType = jobType,
            Status = GeospatialProcessingStatus.Pending,
            IdempotencyKey = idempotencyKey,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        return await repository.CreateAsync(job, ct);
    }
}

public record SpatialProfileWorkItem(string FieldId, string JobId);

public record SatelliteWorkItem(string FieldId, string? CatalogItemId, string JobId);

public record TaskConditionWorkItem(string FieldId, string JobId);

public record FieldHistoryWorkItem(string FieldId, string JobId);
