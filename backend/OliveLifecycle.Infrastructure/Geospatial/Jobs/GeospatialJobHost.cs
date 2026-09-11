using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Geospatial.Processing;

namespace OliveLifecycle.Infrastructure.Geospatial.Jobs;

/// <summary>
/// Runs the recurring geospatial refresh jobs plus the on-demand processing queues.
/// Each schedule owns its own loop so a slow provider cannot delay the others.
/// </summary>
public class GeospatialJobHost : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly GeospatialJobQueue _queue;
    private readonly GeospatialOptions _options;
    private readonly ILogger<GeospatialJobHost> _logger;

    public GeospatialJobHost(
        IServiceScopeFactory scopeFactory,
        GeospatialJobQueue queue,
        IOptions<GeospatialOptions> options,
        ILogger<GeospatialJobHost> logger)
    {
        _scopeFactory = scopeFactory;
        _queue = queue;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Jobs.Enabled)
        {
            _logger.LogInformation("Geospatial background jobs are disabled by configuration.");
            return;
        }

        var loops = new[]
        {
            RunOnIntervalAsync("WeatherRefreshJob", TimeSpan.FromMinutes(_options.Jobs.WeatherRefreshMinutes), RunWeatherRefreshAsync, stoppingToken),
            RunOnIntervalAsync("FireRefreshJob", TimeSpan.FromMinutes(_options.Jobs.FireRefreshMinutes), RunFireRefreshAsync, stoppingToken),
            RunOnIntervalAsync("SatelliteDiscoveryJob", TimeSpan.FromHours(_options.Satellite.DiscoveryIntervalHours), RunSatelliteDiscoveryAsync, stoppingToken),
            RunOnIntervalAsync("SatelliteRetentionJob", TimeSpan.FromHours(24), RunSatelliteRetentionAsync, stoppingToken),
            RunOnIntervalAsync("DailyFieldSnapshotJob", TimeSpan.FromHours(1), RunDailySnapshotsAsync, stoppingToken),
            ProcessSpatialProfileQueueAsync(stoppingToken),
            ProcessSatelliteQueueAsync(stoppingToken),
            ProcessTaskConditionQueueAsync(stoppingToken),
            ProcessFieldHistoryQueueAsync(stoppingToken)
        };

        await Task.WhenAll(loops);
    }

    private async Task RunOnIntervalAsync(
        string jobName,
        TimeSpan interval,
        Func<IServiceProvider, CancellationToken, Task> work,
        CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(interval);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (!await timer.WaitForNextTickAsync(stoppingToken)) return;
                await ExecuteJobAsync(jobName, work, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "{JobName} loop encountered an unexpected error", jobName);
            }
        }
    }

    private async Task ExecuteJobAsync(string jobName, Func<IServiceProvider, CancellationToken, Task> work, CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();
        using var scope = _scopeFactory.CreateScope();
        try
        {
            await work(scope.ServiceProvider, ct);
            _logger.LogInformation("{JobName} completed in {DurationMs} ms", jobName, stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{JobName} failed after {DurationMs} ms", jobName, stopwatch.ElapsedMilliseconds);
        }
    }

    private async Task ProcessSpatialProfileQueueAsync(CancellationToken ct)
    {
        await foreach (var item in _queue.SpatialProfileReader.ReadAllAsync(ct))
        {
            using var scope = _scopeFactory.CreateScope();
            await RunQueuedJobAsync(scope.ServiceProvider, item.JobId, async provider =>
            {
                var service = provider.GetRequiredService<IFieldSpatialProfileService>();
                await service.ProcessFieldAsync(item.FieldId, ct);

                var proposals = provider.GetRequiredService<ITaskProposalEngine>();
                await proposals.EvaluateFieldAsync(item.FieldId, resultYear: null, cancellationToken: ct);
            }, ct);
        }
    }

    private async Task ProcessSatelliteQueueAsync(CancellationToken ct)
    {
        await foreach (var item in _queue.SatelliteReader.ReadAllAsync(ct))
        {
            using var scope = _scopeFactory.CreateScope();
            await RunQueuedJobAsync(scope.ServiceProvider, item.JobId, async provider =>
            {
                var service = provider.GetRequiredService<ISatelliteProcessingService>();
                await service.ProcessFieldAsync(item.FieldId, item.CatalogItemId, ct);
            }, ct);
        }
    }

    private async Task ProcessFieldHistoryQueueAsync(CancellationToken ct)
    {
        await foreach (var item in _queue.FieldHistoryReader.ReadAllAsync(ct))
        {
            using var scope = _scopeFactory.CreateScope();
            await RunQueuedJobAsync(scope.ServiceProvider, item.JobId, async provider =>
            {
                var fieldRepository = provider.GetRequiredService<IFieldRepository>();
                var field = await fieldRepository.GetByIdAsync(item.FieldId, ct);
                if (field?.Boundary == null) return;

                var weather = provider.GetRequiredService<IWeatherIntelligenceService>();
                await weather.BackfillHistoryAsync(field, ct);

                // Chronologio's right-hand weather pane reads compiled month/year
                // reviews. Build them as soon as daily snapshots exist so the
                // journal is not empty while monthly Sentinel history downloads.
                var reviews = provider.GetRequiredService<IWeatherReviewCompiler>();
                await reviews.RebuildForFieldAsync(item.FieldId, ct);

                var satellite = provider.GetRequiredService<ISatelliteProcessingService>();
                await satellite.ProcessHistoricalAsync(item.FieldId, ct);
                await reviews.RebuildForFieldAsync(item.FieldId, ct);
            }, ct);
        }
    }

    private async Task ProcessTaskConditionQueueAsync(CancellationToken ct)
    {
        await foreach (var item in _queue.TaskConditionReader.ReadAllAsync(ct))
        {
            using var scope = _scopeFactory.CreateScope();
            await RunQueuedJobAsync(scope.ServiceProvider, item.JobId, async provider =>
            {
                var fieldRepository = provider.GetRequiredService<IFieldRepository>();
                var field = await fieldRepository.GetByIdAsync(item.FieldId, ct);
                if (field == null) return;

                // Legacy TaskConditionEvaluator (TaskItem keyword warnings) retired for FieldTasks.
                // FieldTasks use the Phase 4 suitability engine + proposal engine below.
                var fieldTaskWeather = provider.GetRequiredService<IFieldTaskWeatherEvaluationService>();
                await fieldTaskWeather.EvaluateFieldAsync(field.Id, ct);

                // Phase 7: weather/alert changes re-evaluate event-triggered proposals.
                var proposals = provider.GetRequiredService<ITaskProposalEngine>();
                await proposals.EvaluateFieldAsync(field.Id, resultYear: null, cancellationToken: ct);
            }, ct);
        }
    }

    private async Task RunQueuedJobAsync(IServiceProvider provider, string jobId, Func<IServiceProvider, Task> work, CancellationToken ct)
    {
        var jobRepository = provider.GetRequiredService<IGeospatialProcessingJobRepository>();
        var job = await jobRepository.GetByIdAsync(jobId, ct);
        if (job != null)
        {
            job.Status = GeospatialProcessingStatus.Processing;
            job.StartedAt = DateTime.UtcNow;
            job.UpdatedAt = DateTime.UtcNow;
            await jobRepository.UpdateAsync(job, ct);
        }

        try
        {
            await work(provider);
            if (job != null)
            {
                job.Status = GeospatialProcessingStatus.Completed;
                job.CompletedAt = DateTime.UtcNow;
                job.UpdatedAt = DateTime.UtcNow;
                await jobRepository.UpdateAsync(job, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Queued geospatial job {JobId} failed", jobId);
            if (job != null)
            {
                job.Status = GeospatialProcessingStatus.Failed;
                job.LastError = ex.Message;
                job.UpdatedAt = DateTime.UtcNow;
                await jobRepository.UpdateAsync(job, ct);
            }
        }
    }

    private static async Task RunWeatherRefreshAsync(IServiceProvider provider, CancellationToken ct)
    {
        var fieldRepository = provider.GetRequiredService<IFieldRepository>();
        var weather = provider.GetRequiredService<IWeatherIntelligenceService>();
        var health = provider.GetRequiredService<IDataSourceHealthRepository>();
        var queue = provider.GetRequiredService<IGeospatialJobQueue>();
        var logger = provider.GetRequiredService<ILogger<GeospatialJobHost>>();

        var fields = await fieldRepository.GetActiveFieldsWithCoordinatesAsync(ct);
        var refreshedGridKeys = new HashSet<string>();
        var failures = 0;

        foreach (var field in fields)
        {
            if (field.CenterPoint?.Coordinates is not { Count: >= 2 }) continue;
            var latitude = field.CenterPoint.Coordinates[1];
            var longitude = field.CenterPoint.Coordinates[0];

            // Fields sharing a forecast grid cell reuse the same provider call, but
            // each field still needs its own task warnings re-checked afterwards.
            if (refreshedGridKeys.Add(weather.ComputeGridKey(latitude, longitude)))
            {
                try
                {
                    await weather.RefreshLocationAsync(latitude, longitude, ct);
                }
                catch (Exception ex)
                {
                    failures++;
                    logger.LogWarning(ex, "Weather refresh failed for field {FieldId}", field.Id);
                    continue;
                }
            }

            await queue.EnqueueTaskConditionsAsync(field.Id, ct);
        }

        await RecordHealthAsync(health, "open-meteo", "Open-Meteo",
            failures == 0 ? "Healthy" : "Degraded",
            $"{refreshedGridKeys.Count} grid locations refreshed", failures == 0, ct);
    }

    private static async Task RunFireRefreshAsync(IServiceProvider provider, CancellationToken ct)
    {
        var fireProvider = provider.GetRequiredService<IFireDetectionProvider>();
        var repository = provider.GetRequiredService<IFireDetectionRepository>();
        var health = provider.GetRequiredService<IDataSourceHealthRepository>();

        try
        {
            var detections = await fireProvider.FetchActiveFiresAsync(ct);
            await repository.ReplaceAllAsync(detections, ct);
            await RecordHealthAsync(health, "firms", "NASA FIRMS", "Healthy", $"{detections.Count} active detections", true, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // The previous detections stay in place: stale fire data is more useful
            // than none, provided the health record shows it is stale.
            await RecordHealthAsync(health, "firms", "NASA FIRMS", "Degraded", ex.Message, false, ct);
            throw;
        }
    }

    private static async Task RunSatelliteDiscoveryAsync(IServiceProvider provider, CancellationToken ct)
    {
        var fieldRepository = provider.GetRequiredService<IFieldRepository>();
        var queue = provider.GetRequiredService<IGeospatialJobQueue>();
        var health = provider.GetRequiredService<IDataSourceHealthRepository>();

        var fields = await fieldRepository.GetActiveFieldsWithCoordinatesAsync(ct);
        var queued = 0;

        foreach (var field in fields)
        {
            if (field.Boundary == null)
            {
                continue;
            }

            await queue.EnqueueSatelliteProcessingAsync(field.Id, null, ct);
            queued++;
        }

        await RecordHealthAsync(health, "sentinel-2", "Sentinel-2 (Copernicus)", "Healthy", $"{queued} fields queued for processing", true, ct);
    }

    private static async Task RunSatelliteRetentionAsync(IServiceProvider provider, CancellationToken ct)
    {
        var satellite = provider.GetRequiredService<ISatelliteProcessingService>();
        await satellite.PruneAsync(ct);
    }

    private static async Task RunDailySnapshotsAsync(IServiceProvider provider, CancellationToken ct)
    {
        var fieldRepository = provider.GetRequiredService<IFieldRepository>();
        var weather = provider.GetRequiredService<IWeatherIntelligenceService>();
        var reviews = provider.GetRequiredService<IWeatherReviewCompiler>();
        var logger = provider.GetRequiredService<ILogger<GeospatialJobHost>>();

        var yesterday = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));
        var fields = await fieldRepository.GetActiveFieldsWithCoordinatesAsync(ct);
        foreach (var field in fields)
        {
            try
            {
                await weather.CreateDailySnapshotAsync(field, yesterday, ct);
                await reviews.RebuildCurrentAsync(field.Id, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Daily snapshot failed for field {FieldId}", field.Id);
            }
        }
    }

    private static async Task RecordHealthAsync(
        IDataSourceHealthRepository repository,
        string sourceId,
        string displayName,
        string status,
        string details,
        bool succeeded,
        CancellationToken ct)
    {
        var existing = (await repository.GetAllAsync(ct)).FirstOrDefault(h => h.SourceId == sourceId);
        var health = existing ?? new DataSourceHealth
        {
            Id = sourceId,
            SourceId = sourceId,
            CreatedAt = DateTime.UtcNow
        };
        health.DisplayName = displayName;
        health.Status = status;
        health.Details = details;
        health.UpdatedAt = DateTime.UtcNow;
        if (succeeded)
        {
            health.LastSuccessfulUpdate = DateTime.UtcNow;
            health.LastError = null;
        }
        await repository.UpsertAsync(health, ct);
    }
}
