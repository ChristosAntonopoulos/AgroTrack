using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Lifecycle;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class LifecycleService : ILifecycleService
{
    private readonly ILifecycleRepository _lifecycleRepository;
    private readonly IFieldRepository _fieldRepository;
    private readonly IFieldAccessService _fieldAccessService;
    private readonly IActivityService _activityService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IFieldLifecycleSync _fieldLifecycleSync;
    private readonly ILogger<LifecycleService> _logger;

    public LifecycleService(
        ILifecycleRepository lifecycleRepository,
        IFieldRepository fieldRepository,
        IFieldAccessService fieldAccessService,
        IActivityService activityService,
        IDateTimeProvider dateTimeProvider,
        IFieldLifecycleSync fieldLifecycleSync,
        ILogger<LifecycleService> logger)
    {
        _lifecycleRepository = lifecycleRepository;
        _fieldRepository = fieldRepository;
        _fieldAccessService = fieldAccessService;
        _activityService = activityService;
        _dateTimeProvider = dateTimeProvider;
        _fieldLifecycleSync = fieldLifecycleSync;
        _logger = logger;
    }

    public async Task<LifecycleDto> InitializeLifecycleAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserModifyFieldAsync(fieldId, userId, cancellationToken) && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to initialize lifecycle for this field.");
        }

        var existing = await _lifecycleRepository.GetByFieldIdAsync(fieldId, cancellationToken);
        if (existing != null)
        {
            return LifecycleMapper.ToDto(existing);
        }

        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        var now = _dateTimeProvider.UtcNow;
        var lifecycle = new Lifecycle
        {
            FieldId = fieldId,
            CurrentYear = "low",
            CurrentStage = OliveLifecycleStage.Dormancy,
            CycleStartDate = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _lifecycleRepository.CreateAsync(lifecycle, cancellationToken);

        field.CurrentLifecycleYear = "low";
        field.CurrentLifecycleStage = OliveLifecycleStage.Dormancy;
        await _fieldRepository.UpdateAsync(field, cancellationToken);

        _logger.LogInformation("Lifecycle initialized for field {FieldId}", fieldId);
        return LifecycleMapper.ToDto(created);
    }

    public async Task<LifecycleDto?> GetLifecycleByFieldIdAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var lifecycle = await _lifecycleRepository.GetByFieldIdAsync(fieldId, cancellationToken);
        return lifecycle == null ? null : LifecycleMapper.ToDto(lifecycle);
    }

    public async Task<LifecycleDto> ProgressCycleAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserModifyFieldAsync(fieldId, userId, cancellationToken) && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to progress lifecycle for this field.");
        }

        var lifecycle = await _lifecycleRepository.GetByFieldIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Lifecycle not found for this field.");

        var now = _dateTimeProvider.UtcNow;
        var cycleStart = lifecycle.CycleStartDate;
        var previousYear = lifecycle.CurrentYear;

        if (lifecycle.LastProgressionDate == null ||
            now.Year > lifecycle.LastProgressionDate.Value.Year ||
            (now.Year == lifecycle.LastProgressionDate.Value.Year && now.DayOfYear >= cycleStart.DayOfYear))
        {
            lifecycle.CurrentYear = lifecycle.CurrentYear == "low" ? "high" : "low";
            lifecycle.LastProgressionDate = now;
            lifecycle.UpdatedAt = now;

            var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
                ?? throw new NotFoundException("Field not found.");
            field.CurrentLifecycleYear = lifecycle.CurrentYear;
            field.UpdatedAt = now;
            await _fieldLifecycleSync.SyncAsync(field, lifecycle, cancellationToken);

            await _activityService.RecordAsync(
                fieldId,
                "lifecycle_year_changed",
                $"Lifecycle year changed from {previousYear} to {lifecycle.CurrentYear}",
                userId,
                metadata: new Dictionary<string, string>
                {
                    ["previousYear"] = previousYear,
                    ["newYear"] = lifecycle.CurrentYear
                },
                cancellationToken: cancellationToken);

            _logger.LogInformation("Lifecycle progressed for field {FieldId} to {Year}", fieldId, lifecycle.CurrentYear);
            return LifecycleMapper.ToDto(lifecycle);
        }

        return LifecycleMapper.ToDto(lifecycle);
    }

    public async Task<LifecycleDto> AdvanceStageAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserModifyFieldAsync(fieldId, userId, cancellationToken) && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to advance lifecycle stage for this field.");
        }

        var lifecycle = await _lifecycleRepository.GetByFieldIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Lifecycle not found for this field.");

        var currentStage = OliveLifecycleStage.Normalize(lifecycle.CurrentStage);
        var nextStage = OliveLifecycleStage.GetNext(currentStage)
            ?? throw new ValidationException("Already at the final lifecycle stage.");

        lifecycle.CurrentStage = nextStage;
        lifecycle.UpdatedAt = _dateTimeProvider.UtcNow;

        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        field.CurrentLifecycleStage = nextStage;
        field.UpdatedAt = _dateTimeProvider.UtcNow;
        await _fieldLifecycleSync.SyncAsync(field, lifecycle, cancellationToken);

        await _activityService.RecordAsync(
            fieldId,
            "lifecycle_stage_changed",
            $"Lifecycle stage advanced from {currentStage} to {nextStage}",
            userId,
            metadata: new Dictionary<string, string>
            {
                ["previousStage"] = currentStage,
                ["newStage"] = nextStage
            },
            cancellationToken: cancellationToken);

        _logger.LogInformation("Lifecycle stage advanced for field {FieldId} to {Stage}", fieldId, nextStage);
        return LifecycleMapper.ToDto(lifecycle);
    }

    public async Task<LifecycleDto> RevertStageAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserModifyFieldAsync(fieldId, userId, cancellationToken) && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to revert lifecycle stage for this field.");
        }

        var lifecycle = await _lifecycleRepository.GetByFieldIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Lifecycle not found for this field.");

        var currentStage = OliveLifecycleStage.Normalize(lifecycle.CurrentStage);
        var previousStageKey = OliveLifecycleStage.GetPrevious(currentStage)
            ?? throw new ValidationException("Already at the first lifecycle stage.");

        lifecycle.CurrentStage = previousStageKey;
        lifecycle.UpdatedAt = _dateTimeProvider.UtcNow;

        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        field.CurrentLifecycleStage = previousStageKey;
        field.UpdatedAt = _dateTimeProvider.UtcNow;
        await _fieldLifecycleSync.SyncAsync(field, lifecycle, cancellationToken);

        await _activityService.RecordAsync(
            fieldId,
            "lifecycle_stage_changed",
            $"Lifecycle stage reverted from {currentStage} to {previousStageKey}",
            userId,
            metadata: new Dictionary<string, string>
            {
                ["previousStage"] = currentStage,
                ["newStage"] = previousStageKey
            },
            cancellationToken: cancellationToken);

        _logger.LogInformation("Lifecycle stage reverted for field {FieldId} to {Stage}", fieldId, previousStageKey);
        return LifecycleMapper.ToDto(lifecycle);
    }

    public async Task<bool> ValidateTaskForLifecycleAsync(string fieldId, string lifecycleYear, CancellationToken cancellationToken = default)
    {
        var lifecycle = await _lifecycleRepository.GetByFieldIdAsync(fieldId, cancellationToken);
        return lifecycle != null && lifecycle.CurrentYear == lifecycleYear;
    }
}
