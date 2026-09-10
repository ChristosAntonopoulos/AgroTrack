using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Mappings;
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

    Task<TaskExecutionDto> CompleteAsync(
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
}

public class FieldTaskService : IFieldTaskService
{
    private readonly IFieldTaskRepository _tasks;
    private readonly ITaskExecutionRepository _executions;
    private readonly IFieldWorkTaskTemplateVersionRepository _versions;
    private readonly IFieldWorkAuthorizationService _auth;
    private readonly IDateTimeProvider _clock;
    private readonly IFieldTaskWeatherEvaluationService _weatherEvaluation;
    private readonly ITaskProposalEngine _proposalEngine;

    public FieldTaskService(
        IFieldTaskRepository tasks,
        ITaskExecutionRepository executions,
        IFieldWorkTaskTemplateVersionRepository versions,
        IFieldWorkAuthorizationService auth,
        IDateTimeProvider clock,
        IFieldTaskWeatherEvaluationService weatherEvaluation,
        ITaskProposalEngine proposalEngine)
    {
        _tasks = tasks;
        _executions = executions;
        _versions = versions;
        _auth = auth;
        _clock = clock;
        _weatherEvaluation = weatherEvaluation;
        _proposalEngine = proposalEngine;
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
        if (!string.IsNullOrWhiteSpace(fieldId))
        {
            await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);
        }

        var query = new FieldTaskQuery
        {
            FieldId = fieldId,
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
            TemplateCode = dto.TemplateCode,
            TemplateVersion = templateVersion,
            Title = dto.Title.Trim(),
            Description = dto.Description,
            Status = FieldTaskStatus.Planned,
            PlannedStart = plannedStart,
            PlannedEnd = dto.PlannedEnd,
            PreferredTimeWindow = dto.PreferredTimeWindow,
            AssignedUserId = dto.AssignedUserId,
            AssignedCollaboratorId = dto.AssignedCollaboratorId,
            ResponsibleUserId = userId,
            ChecklistSnapshot = checklist,
            EstimatedCost = dto.EstimatedCost,
            Notes = dto.Notes,
            RelatedHarvestId = dto.RelatedHarvestId,
            WeatherSuitability = WeatherSuitability.Unknown,
            CreatedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _tasks.CreateAsync(task, cancellationToken);
        await TryEvaluateWeatherAsync(created, language, cancellationToken);
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

    public async Task<FieldTaskDto> StartAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanOperateTaskAsync(task, userId, userRole, cancellationToken);
        EnsureNotTerminal(task);

        if (task.Status is FieldTaskStatus.Planned or FieldTaskStatus.Ready or FieldTaskStatus.Blocked)
        {
            task.Status = FieldTaskStatus.InProgress;
            task.UpdatedAt = _clock.UtcNow;
            task = await _tasks.UpdateAsync(task, cancellationToken);
        }

        return FieldWorkMapper.ToDto(task, language);
    }

    public async Task<TaskExecutionDto> CompleteAsync(
        string id,
        CompleteFieldTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanOperateTaskAsync(task, userId, userRole, cancellationToken);

        if (task.Status == FieldTaskStatus.Cancelled)
        {
            throw new ValidationException("Cancelled tasks cannot be completed.");
        }

        var outcome = TaskExecutionOutcomeExtensions.FromApiString(dto.Outcome)
            ?? TaskExecutionOutcome.Completed;
        var now = _clock.UtcNow;

        ApplyChecklistAnswers(task, dto.ChecklistAnswers);

        var execution = new TaskExecution
        {
            TaskId = task.Id,
            FieldId = task.FieldId,
            ResultYear = task.ResultYear,
            StartedAt = dto.StartedAt ?? (task.Status == FieldTaskStatus.InProgress ? task.UpdatedAt : now),
            CompletedAt = dto.CompletedAt ?? now,
            Outcome = outcome,
            CompletedByUserIds = [userId],
            ChecklistResults = task.ChecklistSnapshot.Select(ToResult).ToList(),
            Notes = dto.Notes,
            AttachmentIds = dto.AttachmentIds?.ToList() ?? [],
            TreatedAreaHectares = dto.TreatedAreaHectares,
            WeatherSuitability = task.WeatherSuitability,
            WeatherEvaluationId = task.WeatherEvaluationId,
            PlannedStartSnapshot = task.PlannedStart,
            PlannedEndSnapshot = task.PlannedEnd,
            RecordedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        if (outcome == TaskExecutionOutcome.PartiallyCompleted && dto.CreateFollowUpForRemainder)
        {
            var followUp = new FieldTask
            {
                FieldId = task.FieldId,
                ResultYear = task.ResultYear,
                TemplateCode = task.TemplateCode,
                TemplateVersion = task.TemplateVersion,
                Title = task.Title,
                Description = task.Description,
                Status = FieldTaskStatus.Planned,
                PlannedStart = task.PlannedStart,
                PlannedEnd = task.PlannedEnd,
                PreferredTimeWindow = task.PreferredTimeWindow,
                AssignedUserId = task.AssignedUserId,
                AssignedCollaboratorId = task.AssignedCollaboratorId,
                ResponsibleUserId = task.ResponsibleUserId,
                ChecklistSnapshot = task.ChecklistSnapshot
                    .Where(c => !c.IsAnswered)
                    .Select(CloneChecklistItem)
                    .ToList(),
                EstimatedCost = null,
                Notes = "Υπόλοιπο εργασίας",
                RelatedHarvestId = task.RelatedHarvestId,
                WeatherSuitability = WeatherSuitability.Unknown,
                CreatedByUserId = userId,
                CreatedAt = now,
                UpdatedAt = now
            };

            var createdFollowUp = await _tasks.CreateAsync(followUp, cancellationToken);
            execution.FollowUpRequired = true;
            execution.FollowUpTaskId = createdFollowUp.Id;
        }

        var createdExecution = await _executions.CreateAsync(execution, cancellationToken);

        task.LatestExecutionId = createdExecution.Id;
        task.ChecklistSnapshot = task.ChecklistSnapshot;
        task.UpdatedAt = now;
        task.Status = outcome switch
        {
            TaskExecutionOutcome.Completed => FieldTaskStatus.Completed,
            TaskExecutionOutcome.NotDone => FieldTaskStatus.Cancelled,
            _ => FieldTaskStatus.Completed
        };

        await _tasks.UpdateAsync(task, cancellationToken);

        // Completion can unlock follow-up event proposals (post-treatment rain, fertiliser + rain, etc.).
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

        return FieldWorkMapper.ToDto(createdExecution, language);
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

        if (!string.IsNullOrWhiteSpace(execution.FollowUpTaskId))
        {
            var followUp = await _tasks.GetByIdAsync(execution.FollowUpTaskId, cancellationToken);
            if (followUp is { Status: FieldTaskStatus.Planned or FieldTaskStatus.Ready }
                && string.IsNullOrWhiteSpace(followUp.LatestExecutionId))
            {
                followUp.Status = FieldTaskStatus.Cancelled;
                followUp.UpdatedAt = now;
                await _tasks.UpdateAsync(followUp, cancellationToken);
            }
        }

        // Restore original plan dates from the execution snapshot; reopen the FieldTask.
        task.Status = FieldTaskStatus.InProgress;
        task.PlannedStart = execution.PlannedStartSnapshot ?? task.PlannedStart;
        task.PlannedEnd = execution.PlannedEndSnapshot ?? task.PlannedEnd;
        task.LatestExecutionId = null;
        task.UpdatedAt = now;
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

        if (task.Status == FieldTaskStatus.Completed)
        {
            throw new ValidationException("Completed tasks cannot be cancelled.");
        }

        task.Status = FieldTaskStatus.Cancelled;
        task.UpdatedAt = _clock.UtcNow;
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
        return FieldWorkMapper.ToDto(updated, language);
    }

    private async Task<FieldTask> RequireTaskAsync(string id, CancellationToken cancellationToken)
    {
        return await _tasks.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Field task not found.");
    }

    private static void EnsureNotTerminal(FieldTask task)
    {
        if (task.Status is FieldTaskStatus.Completed or FieldTaskStatus.Cancelled)
        {
            throw new ValidationException("This task can no longer be modified.");
        }
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
