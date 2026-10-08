using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Application.Services;

public interface IFieldTaskService
{
    Task<IReadOnlyList<FieldTaskDto>> ListAsync(
        string? fieldId,
        int? resultYear,
        string? status,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto?> GetByIdAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> CreateAsync(
        CreateFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> UpdateAsync(
        string id,
        UpdateFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> StartAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> UndoStartAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> PauseAsync(
        string id,
        PauseFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> ResumeAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> CompleteAsync(
        string id,
        CompleteFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> CancelAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> RescheduleAsync(
        string id,
        RescheduleFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> AssignAsync(
        string id,
        AssignFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> UndoCompletionAsync(
        string executionId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> SetChecklistItemAsync(
        string id,
        string key,
        bool completed,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> BlockAsync(
        string id,
        string? reason,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> SkipAsync(
        string id,
        string? reason,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> ResolveAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldTaskDto> ReopenAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);
}

public class FieldTaskService : IFieldTaskService
{
    private readonly IFieldTaskRepository _tasks;
    private readonly ITaskExecutionRepository _executions;
    private readonly IFieldWorkTaskTemplateVersionRepository _versions;
    private readonly IFieldWorkAuthorizationService _auth;
    private readonly IFieldAccessScopeService _fieldAccessScope;
    private readonly IDateTimeProvider _clock;
    private readonly IFieldTaskWeatherEvaluationService _weatherEvaluation;
    private readonly ITaskProposalEngine _proposalEngine;
    private readonly IUserNotificationService _notifications;
    private readonly IFieldStatusGuard _fieldStatusGuard;

    public FieldTaskService(
        IFieldTaskRepository tasks,
        ITaskExecutionRepository executions,
        IFieldWorkTaskTemplateVersionRepository versions,
        IFieldWorkAuthorizationService auth,
        IFieldAccessScopeService fieldAccessScope,
        IDateTimeProvider clock,
        IFieldTaskWeatherEvaluationService weatherEvaluation,
        ITaskProposalEngine proposalEngine,
        IUserNotificationService notifications,
        IFieldStatusGuard fieldStatusGuard)
    {
        _tasks = tasks;
        _executions = executions;
        _versions = versions;
        _auth = auth;
        _fieldAccessScope = fieldAccessScope;
        _clock = clock;
        _weatherEvaluation = weatherEvaluation;
        _proposalEngine = proposalEngine;
        _notifications = notifications;
        _fieldStatusGuard = fieldStatusGuard;
    }

    public async Task<IReadOnlyList<FieldTaskDto>> ListAsync(
        string? fieldId,
        int? resultYear,
        string? status,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        IReadOnlyList<string>? scopedFieldIds = null;
        if (!string.IsNullOrWhiteSpace(fieldId))
        {
            await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);
        }
        else
        {
            scopedFieldIds = await _fieldAccessScope.ResolveAccessibleFieldIdsAsync(
                userId, userRole, FamilyModules.Tasks, cancellationToken);
            if (scopedFieldIds.Count == 0)
            {
                return Array.Empty<FieldTaskDto>();
            }
        }

        var query = new FieldTaskQuery
        {
            FieldId = fieldId,
            FieldIds = scopedFieldIds,
            ResultYear = resultYear,
            Status = FieldTaskStatusExtensions.FromApiString(status)
        };

        var tasks = await _tasks.QueryAsync(query, cancellationToken);
        return tasks.Select(t => FieldWorkMapper.ToDto(t, language)).ToList();
    }

    public async Task<FieldTaskDto?> GetByIdAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await _tasks.GetByIdAsync(id, cancellationToken);
        if (task is null)
        {
            return null;
        }

        await _auth.EnsureCanViewFieldWorkAsync(task.FieldId, userId, userRole, cancellationToken);
        return FieldWorkMapper.ToDto(task, language);
    }

    public async Task<FieldTaskDto> CreateAsync(
        CreateFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanCreateOrEditTaskAsync(dto.FieldId, userId, userRole, cancellationToken);
        await _fieldStatusGuard.EnsureAcceptsNewRecordsAsync(dto.FieldId, cancellationToken);

        var now = _clock.UtcNow;
        var plannedStart = dto.PlannedStart;
        var resultYear = ResultYearResolver.Resolve(plannedStart, dto.ResultYear, now);

        List<FieldTaskChecklistItem> checklist = [];
        int? templateVersion = null;
        if (!string.IsNullOrWhiteSpace(dto.TemplateCode))
        {
            var version = await _versions.GetCurrentAsync(dto.TemplateCode, cancellationToken);
            if (version != null)
            {
                checklist = ChecklistSnapshotFactory.CopyFromTemplate(version.DefaultChecklist);
                templateVersion = version.Version;
            }
        }

        var task = new FieldTask
        {
            FieldId = dto.FieldId,
            ResultYear = resultYear,
            OwnerId = userId,
            TemplateCode = dto.TemplateCode,
            TemplateVersion = templateVersion,
            Title = dto.Title.Trim(),
            Description = dto.Description,
            Status = FieldTaskStatus.Planned,
            Source = string.IsNullOrWhiteSpace(dto.TemplateCode) ? TaskSource.Custom : TaskSource.Template,
            TimingBucket = TaskTimingBucket.Later,
            ScheduledFor = plannedStart,
            PlannedStart = plannedStart,
            PlannedEnd = dto.PlannedEnd,
            PreferredTimeWindow = dto.PreferredTimeWindow,
            AssigneeId = dto.AssignedUserId,
            AssignedUserId = dto.AssignedUserId,
            AssignedCollaboratorId = dto.AssignedCollaboratorId,
            ResponsibleUserId = userId,
            ChecklistSnapshot = checklist,
            EstimatedCost = dto.EstimatedCost,
            Notes = dto.Notes,
            Note = dto.Notes,
            RelatedHarvestId = dto.RelatedHarvestId,
            WeatherSuitability = WeatherSuitability.Unknown,
            WorkGroupId = string.IsNullOrWhiteSpace(dto.WorkGroupId) ? null : dto.WorkGroupId.Trim(),
            CreatedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };
        Record(task, "created", userId, now);

        var created = await _tasks.CreateAsync(task, cancellationToken);
        await TryEvaluateWeatherAsync(created, language, cancellationToken);
        await NotifyAssignmentAsync(created, userId, cancellationToken);
        return FieldWorkMapper.ToDto(created, language);
    }

    public async Task<FieldTaskDto> UpdateAsync(
        string id,
        UpdateFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanCreateOrEditTaskAsync(task.FieldId, userId, userRole, cancellationToken);
        EnsureNotTerminal(task);

        if (!string.IsNullOrWhiteSpace(dto.Title))
        {
            task.Title = dto.Title.Trim();
        }

        if (dto.Description != null)
        {
            task.Description = dto.Description;
        }

        if (dto.PlannedStart.HasValue)
        {
            task.PlannedStart = dto.PlannedStart;
        }

        if (dto.PlannedEnd.HasValue)
        {
            task.PlannedEnd = dto.PlannedEnd;
        }

        if (dto.PreferredTimeWindow != null)
        {
            task.PreferredTimeWindow = dto.PreferredTimeWindow;
        }

        if (dto.Notes != null)
        {
            task.Notes = dto.Notes;
        }

        if (dto.EstimatedCost.HasValue)
        {
            task.EstimatedCost = dto.EstimatedCost;
        }

        if (dto.ResultYear.HasValue || dto.PlannedStart.HasValue)
        {
            task.ResultYear = ResultYearResolver.Resolve(
                task.PlannedStart,
                dto.ResultYear ?? task.ResultYear,
                _clock.UtcNow);
        }

        task.UpdatedAt = _clock.UtcNow;
        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        if (dto.PlannedStart.HasValue || dto.PlannedEnd.HasValue)
        {
            await TryEvaluateWeatherAsync(updated, language, cancellationToken);
        }

        return FieldWorkMapper.ToDto(updated, language);
    }

    public Task<FieldTaskDto> StartAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default) =>
        throw new ValidationException("Start is no longer supported. Complete the planned task or link a work record.");

    public Task<FieldTaskDto> UndoStartAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default) =>
        throw new ValidationException("Start/pause lifecycle actions were removed.");

    public Task<FieldTaskDto> PauseAsync(
        string id,
        PauseFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default) =>
        throw new ValidationException("Pause is no longer supported.");

    public Task<FieldTaskDto> ResumeAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default) =>
        throw new ValidationException("Resume is no longer supported.");

    public async Task<FieldTaskDto> CompleteAsync(
        string id,
        CompleteFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanOperateTaskAsync(task, userId, userRole, cancellationToken);

        if (task.Status == FieldTaskStatus.Skipped)
        {
            throw new ValidationException("Skipped tasks cannot be completed.");
        }

        if (task.Status == FieldTaskStatus.Done)
        {
            return FieldWorkMapper.ToDto(task, language);
        }

        var now = _clock.UtcNow;
        ApplyChecklistAnswers(task, dto.ChecklistAnswers);
        var incompleteRequired = task.ChecklistSnapshot.Count(item =>
            item.Requirement == ChecklistItemRequirement.RequiredBeforeCompletion && !item.IsAnswered);
        if (incompleteRequired > 0 && !dto.AllowIncomplete)
        {
            throw new ValidationException($"{incompleteRequired} required checks are incomplete.");
        }

        if (!string.IsNullOrWhiteSpace(dto.Notes))
        {
            task.Notes = dto.Notes;
            task.Note = dto.Notes;
        }

        if (dto.AttachmentIds is { Count: > 0 })
        {
            task.AttachmentIds = dto.AttachmentIds.ToList();
        }

        // Mark done only — do NOT create TaskExecution/WorkRecord or follow-up tasks.
        task.Status = FieldTaskStatus.Done;
        task.CompletedAt = dto.CompletedAt ?? now;
        task.CompletedByUserId = userId;
        task.UpdatedAt = now;
        Record(task, "completed", userId, now, dto.Notes);

        var updated = await _tasks.UpdateAsync(task, cancellationToken);

        try
        {
            await _proposalEngine.EvaluateFieldAsync(
                task.FieldId,
                task.ResultYear,
                cancellationToken: cancellationToken);
        }
        catch
        {
            // Proposal refresh must not fail completion.
        }

        return FieldWorkMapper.ToDto(updated, language);
    }

    public async Task<FieldTaskDto> UndoCompletionAsync(
        string executionId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var execution = await _executions.GetByIdAsync(executionId, cancellationToken)
            ?? throw new NotFoundException("Task execution not found.");

        if (!execution.IsActive)
        {
            throw new ValidationException("This completion was already undone.");
        }

        if (string.IsNullOrWhiteSpace(execution.TaskId))
        {
            throw new ValidationException("This work record is not linked to a task.");
        }

        var task = await RequireTaskAsync(execution.TaskId, cancellationToken);
        await _auth.EnsureCanOperateTaskAsync(task, userId, userRole, cancellationToken);

        var now = _clock.UtcNow;
        const int undoWindowHours = 24;
        if ((now - execution.CompletedAt).TotalHours > undoWindowHours)
        {
            throw new ValidationException("Undo window has expired (24 hours).");
        }

        execution.UndoneAt = now;
        execution.UndoneByUserId = userId;
        execution.UpdatedAt = now;
        await _executions.UpdateAsync(execution, cancellationToken);

        task.Status = FieldTaskStatus.Planned;
        task.PlannedStart = execution.PlannedStartSnapshot ?? task.PlannedStart;
        task.PlannedEnd = execution.PlannedEndSnapshot ?? task.PlannedEnd;
        task.LatestExecutionId = null;
        task.LinkedWorkRecordId = null;
        task.CompletedAt = null;
        task.CompletedByUserId = null;
        task.UpdatedAt = now;
        Record(task, "reopened", userId, now);
        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        return FieldWorkMapper.ToDto(updated, language);
    }

    public async Task<FieldTaskDto> CancelAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanCreateOrEditTaskAsync(task.FieldId, userId, userRole, cancellationToken);

        if (task.Status == FieldTaskStatus.Done)
        {
            throw new ValidationException("Done tasks cannot be cancelled.");
        }

        var now = _clock.UtcNow;
        task.Status = FieldTaskStatus.Skipped;
        task.SkippedAt = now;
        task.UpdatedAt = now;
        Record(task, "cancelled", userId, now);
        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        return FieldWorkMapper.ToDto(updated, language);
    }

    public async Task<FieldTaskDto> RescheduleAsync(
        string id,
        RescheduleFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanCreateOrEditTaskAsync(task.FieldId, userId, userRole, cancellationToken);
        EnsureNotTerminal(task);

        // Dates change only on explicit user action — never silently.
        task.PlannedStart = dto.PlannedStart;
        task.PlannedEnd = dto.PlannedEnd;
        if (dto.PreferredTimeWindow != null)
        {
            task.PreferredTimeWindow = dto.PreferredTimeWindow;
        }

        task.ResultYear = ResultYearResolver.Resolve(
            dto.PlannedStart,
            dto.ResultYear ?? task.ResultYear,
            _clock.UtcNow);
        task.UpdatedAt = _clock.UtcNow;
        Record(task, "rescheduled", userId, task.UpdatedAt);

        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        await TryEvaluateWeatherAsync(updated, language, cancellationToken);
        return FieldWorkMapper.ToDto(updated, language);
    }

    public async Task<FieldTaskDto> AssignAsync(
        string id,
        AssignFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanCreateOrEditTaskAsync(task.FieldId, userId, userRole, cancellationToken);
        EnsureNotTerminal(task);

        // Assigning a SavedContact does not grant field membership or financial access.
        task.AssignedUserId = dto.AssignedUserId;
        task.AssignedCollaboratorId = dto.AssignedCollaboratorId;
        if (!string.IsNullOrWhiteSpace(dto.ResponsibleUserId))
        {
            task.ResponsibleUserId = dto.ResponsibleUserId;
        }

        if (dto.AdditionalParticipantUserIds != null)
        {
            task.AdditionalParticipantUserIds = dto.AdditionalParticipantUserIds.ToList();
        }

        task.AssignmentResponse = TaskAssignmentResponse.Pending;
        task.AssignmentRespondedAt = null;
        task.UpdatedAt = _clock.UtcNow;

        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        await NotifyAssignmentAsync(updated, userId, cancellationToken);
        return FieldWorkMapper.ToDto(updated, language);
    }

    public async Task<FieldTaskDto> SetChecklistItemAsync(
        string id,
        string key,
        bool completed,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanOperateTaskAsync(task, userId, userRole, cancellationToken);
        EnsureNotTerminal(task);

        var item = task.ChecklistSnapshot.FirstOrDefault(c => c.Key == key)
            ?? throw new ValidationException("Checklist item was not found.");

        var now = _clock.UtcNow;
        item.IsAnswered = completed;
        item.BoolValue = completed;
        if (!completed)
        {
            item.TextValue = null;
            item.NumberValue = null;
        }

        task.UpdatedAt = now;
        Record(task, completed ? "check_completed" : "check_cleared", userId, now, key);
        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        return FieldWorkMapper.ToDto(updated, language);
    }

    public Task<FieldTaskDto> BlockAsync(
        string id,
        string? reason,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default) =>
        throw new ValidationException("Block is no longer supported. Skip the task instead.");

    public async Task<FieldTaskDto> SkipAsync(
        string id,
        string? reason,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanOperateTaskAsync(task, userId, userRole, cancellationToken);
        EnsureNotTerminal(task);

        var now = _clock.UtcNow;
        task.Status = FieldTaskStatus.Skipped;
        task.SkippedAt = now;
        task.SkippedReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        task.UpdatedAt = now;
        Record(task, "skipped", userId, now, task.SkippedReason);
        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        return FieldWorkMapper.ToDto(updated, language);
    }

    public Task<FieldTaskDto> ResolveAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default) =>
        throw new ValidationException("Resolve is no longer supported.");

    public async Task<FieldTaskDto> ReopenAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanCreateOrEditTaskAsync(task.FieldId, userId, userRole, cancellationToken);

        if (task.Status is not (FieldTaskStatus.Done or FieldTaskStatus.Skipped))
        {
            throw new ValidationException("Only done or skipped tasks can be reopened.");
        }

        var now = _clock.UtcNow;
        task.Status = FieldTaskStatus.Planned;
        task.CompletedAt = null;
        task.CompletedByUserId = null;
        task.SkippedAt = null;
        task.SkippedReason = null;
        task.UpdatedAt = now;
        Record(task, "reopened", userId, now);
        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        return FieldWorkMapper.ToDto(updated, language);
    }

    private async Task NotifyAssignmentAsync(
        FieldTask task,
        string actorUserId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(task.AssignedUserId)
            || string.Equals(task.AssignedUserId, actorUserId, StringComparison.Ordinal))
        {
            return;
        }

        var now = _clock.UtcNow;
        await _notifications.NotifyAsync(new UserNotification
        {
            UserId = task.AssignedUserId,
            Type = "task_assigned",
            Title = task.Title,
            Message = $"New field task assigned: {task.Title}",
            RelatedEntityId = task.Id,
            RelatedEntityType = "Task",
            ActionUrl = $"/tasks/{task.Id}",
            CreatedAt = now,
            UpdatedAt = now
        }, cancellationToken);
    }

    private async Task<FieldTask> RequireTaskAsync(string id, CancellationToken cancellationToken)
    {
        return await _tasks.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Field task not found.");
    }

    private static void EnsureNotTerminal(FieldTask task)
    {
        if (task.Status.IsTerminal())
        {
            throw new ValidationException("This task can no longer be modified.");
        }
    }

    private static void Record(FieldTask task, string action, string actorId, DateTime occurredAt, string? comment = null)
    {
        task.Activity ??= [];
        task.Activity.Add(new FieldTaskActivity
        {
            Action = action,
            ActorId = actorId,
            OccurredAt = occurredAt,
            Comment = comment
        });
    }

    private static void ApplyChecklistAnswers(FieldTask task, List<ChecklistAnswerDto>? answers)
    {
        if (answers is null || answers.Count == 0)
        {
            return;
        }

        foreach (var answer in answers)
        {
            var item = task.ChecklistSnapshot.FirstOrDefault(c => c.Key == answer.Key);
            if (item is null)
            {
                continue;
            }

            item.IsAnswered = true;
            item.TextValue = answer.TextValue;
            item.NumberValue = answer.NumberValue;
            item.BoolValue = answer.BoolValue;
            item.AttachmentIds = answer.AttachmentIds?.ToList() ?? [];
        }
    }

    private static TaskExecutionChecklistResult ToResult(FieldTaskChecklistItem item) => new()
    {
        Key = item.Key,
        GreekLabel = item.GreekLabel,
        EnglishLabel = item.EnglishLabel,
        ItemType = item.ItemType,
        Requirement = item.Requirement,
        IsAnswered = item.IsAnswered,
        TextValue = item.TextValue,
        NumberValue = item.NumberValue,
        BoolValue = item.BoolValue,
        Unit = item.Unit,
        AttachmentIds = item.AttachmentIds.ToList()
    };

    private static FieldTaskChecklistItem CloneChecklistItem(FieldTaskChecklistItem item) => new()
    {
        Key = item.Key,
        GreekLabel = item.GreekLabel,
        EnglishLabel = item.EnglishLabel,
        ItemType = item.ItemType,
        Requirement = item.Requirement,
        Choices = item.Choices.ToList(),
        Unit = item.Unit,
        IsEssential = item.IsEssential,
        SortOrder = item.SortOrder,
        IsAnswered = false
    };

    private async Task TryEvaluateWeatherAsync(
        FieldTask task,
        string language,
        CancellationToken cancellationToken)
    {
        try
        {
            await _weatherEvaluation.EvaluateTaskAsync(task, language, cancellationToken);
        }
        catch
        {
            // Suitability stays Unknown; never block create/reschedule on weather failures.
        }
    }
}
