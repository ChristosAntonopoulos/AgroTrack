using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Application.Services;

public interface ITaskService
{
    Task<IReadOnlyList<TaskDto>> ListAsync(
        string? view,
        string? fieldId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<TaskDto?> GetByIdAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<TaskDto> CreateAsync(
        CreateTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<TaskDto> PatchAsync(
        string id,
        PatchTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<TaskDto> CompleteAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<TaskDto> SkipAsync(
        string id,
        SkipTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<TaskDto> LinkWorkRecordAsync(
        string id,
        LinkWorkRecordDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<TaskDto> UndoCompleteAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);
}

public class TaskService : ITaskService
{
    private readonly IFieldTaskRepository _tasks;
    private readonly ITaskExecutionRepository _workRecords;
    private readonly IFieldWorkTaskTemplateVersionRepository _versions;
    private readonly IFieldWorkAuthorizationService _auth;
    private readonly IFieldAccessScopeService _fieldAccessScope;
    private readonly IDateTimeProvider _clock;
    private readonly IFieldStatusGuard _fieldStatusGuard;
    private readonly IUserNotificationService _notifications;

    public TaskService(
        IFieldTaskRepository tasks,
        ITaskExecutionRepository workRecords,
        IFieldWorkTaskTemplateVersionRepository versions,
        IFieldWorkAuthorizationService auth,
        IFieldAccessScopeService fieldAccessScope,
        IDateTimeProvider clock,
        IFieldStatusGuard fieldStatusGuard,
        IUserNotificationService notifications)
    {
        _tasks = tasks;
        _workRecords = workRecords;
        _versions = versions;
        _auth = auth;
        _fieldAccessScope = fieldAccessScope;
        _clock = clock;
        _fieldStatusGuard = fieldStatusGuard;
        _notifications = notifications;
    }

    public async Task<IReadOnlyList<TaskDto>> ListAsync(
        string? view,
        string? fieldId,
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
                return [];
            }
        }

        var viewKey = (view ?? "today").Trim().ToLowerInvariant();
        var statuses = viewKey switch
        {
            "done" => (IReadOnlyList<FieldTaskStatus>)[FieldTaskStatus.Done, FieldTaskStatus.Skipped],
            _ => [FieldTaskStatus.Planned]
        };

        var items = await _tasks.QueryAsync(
            new FieldTaskQuery
            {
                FieldId = fieldId,
                FieldIds = scopedFieldIds,
                Statuses = statuses
            },
            cancellationToken);

        var today = _clock.UtcNow.Date;
        var filtered = viewKey switch
        {
            "today" => items.Where(t => IsTodayOrOverdue(t, today)).ToList(),
            "upcoming" => items.Where(t => IsUpcoming(t, today)).ToList(),
            "done" => items.OrderByDescending(t => t.CompletedAt ?? t.SkippedAt ?? t.UpdatedAt).ToList(),
            _ => items.ToList()
        };

        return filtered.Select(t => FieldWorkMapper.ToTaskDto(t, language)).ToList();
    }

    public async Task<TaskDto?> GetByIdAsync(
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
        return FieldWorkMapper.ToTaskDto(task, language);
    }

    public async Task<TaskDto> CreateAsync(
        CreateTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.FieldId) || string.IsNullOrWhiteSpace(dto.Title))
        {
            throw new ValidationException("Field and title are required to schedule a task.");
        }

        await _auth.EnsureCanCreateOrEditTaskAsync(dto.FieldId, userId, userRole, cancellationToken);
        await _fieldStatusGuard.EnsureAcceptsNewRecordsAsync(dto.FieldId, cancellationToken);

        var now = _clock.UtcNow;
        var scheduledFor = dto.ScheduledFor ?? dto.PlannedStart ?? ResolveDateFromBucket(dto.TimingBucket, now);
        var timingBucket = TaskTimingBucketExtensions.FromApiString(dto.TimingBucket)
            ?? InferTimingBucket(scheduledFor, now);
        var resultYear = ResultYearResolver.Resolve(scheduledFor, dto.ResultYear, now);
        var hasTemplate = !string.IsNullOrWhiteSpace(dto.TemplateCode);

        List<FieldTaskChecklistItem> checklist = [];
        int? templateVersion = null;
        if (hasTemplate)
        {
            var version = await _versions.GetCurrentAsync(dto.TemplateCode!, cancellationToken);
            if (version != null)
            {
                checklist = ChecklistSnapshotFactory.CopyFromTemplate(version.DefaultChecklist);
                templateVersion = version.Version;
            }
        }

        var assignee = dto.AssigneeId ?? dto.AssignedUserId;
        var title = hasTemplate && string.IsNullOrWhiteSpace(dto.Title)
            ? CuratedTaskTemplates.DisplayTitle(dto.TemplateCode!, language)
            : dto.Title.Trim();

        var task = new FieldTask
        {
            FieldId = dto.FieldId,
            ResultYear = resultYear,
            OwnerId = userId,
            TemplateCode = dto.TemplateCode,
            TemplateVersion = templateVersion,
            Title = title,
            Description = dto.Description,
            Status = FieldTaskStatus.Planned,
            Source = hasTemplate ? TaskSource.Template : TaskSource.Custom,
            TimingBucket = timingBucket,
            ScheduledFor = scheduledFor,
            PlannedStart = scheduledFor,
            PlannedEnd = dto.PlannedEnd,
            AssigneeId = assignee,
            AssignedUserId = assignee,
            AssignedCollaboratorId = dto.AssignedCollaboratorId,
            ResponsibleUserId = userId,
            ChecklistSnapshot = checklist,
            Note = dto.Note ?? dto.Notes,
            Notes = dto.Notes ?? dto.Note,
            Recurrence = dto.Recurrence,
            RelatedHarvestId = dto.RelatedHarvestId,
            WeatherSuitability = WeatherSuitability.Unknown,
            CreatedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };
        Record(task, "created", userId, now);

        var created = await _tasks.CreateAsync(task, cancellationToken);
        if (!string.IsNullOrWhiteSpace(assignee) && !string.Equals(assignee, userId, StringComparison.Ordinal))
        {
            await _notifications.NotifyAsync(new UserNotification
            {
                UserId = assignee!,
                Type = "task_assigned",
                Title = created.Title,
                Message = $"New field task assigned: {created.Title}",
                RelatedEntityId = created.Id,
                RelatedEntityType = "Task",
                ActionUrl = $"/tasks/{created.Id}",
                CreatedAt = now,
                UpdatedAt = now
            }, cancellationToken);
        }

        return FieldWorkMapper.ToTaskDto(created, language);
    }

    public async Task<TaskDto> PatchAsync(
        string id,
        PatchTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanCreateOrEditTaskAsync(task.FieldId, userId, userRole, cancellationToken);
        if (task.Status.IsTerminal())
        {
            throw new ValidationException("Completed or skipped tasks cannot be edited.");
        }

        if (!string.IsNullOrWhiteSpace(dto.Title))
        {
            task.Title = dto.Title.Trim();
        }

        if (dto.Description != null)
        {
            task.Description = dto.Description;
        }

        if (dto.TimingBucket != null)
        {
            task.TimingBucket = TaskTimingBucketExtensions.FromApiString(dto.TimingBucket) ?? task.TimingBucket;
        }

        if (dto.ScheduledFor.HasValue || dto.PlannedStart.HasValue)
        {
            var date = dto.ScheduledFor ?? dto.PlannedStart;
            task.ScheduledFor = date;
            task.PlannedStart = date;
            task.TimingBucket = InferTimingBucket(date, _clock.UtcNow);
        }

        if (dto.PlannedEnd.HasValue)
        {
            task.PlannedEnd = dto.PlannedEnd;
        }

        if (dto.AssigneeId != null || dto.AssignedUserId != null)
        {
            var assignee = dto.AssigneeId ?? dto.AssignedUserId;
            task.AssigneeId = assignee;
            task.AssignedUserId = assignee;
        }

        if (dto.AssignedCollaboratorId != null)
        {
            task.AssignedCollaboratorId = dto.AssignedCollaboratorId;
        }

        if (dto.Note != null || dto.Notes != null)
        {
            task.Note = dto.Note ?? dto.Notes;
            task.Notes = dto.Notes ?? dto.Note;
        }

        if (dto.Recurrence != null)
        {
            task.Recurrence = dto.Recurrence;
        }

        if (dto.ResultYear.HasValue || dto.ScheduledFor.HasValue || dto.PlannedStart.HasValue)
        {
            task.ResultYear = ResultYearResolver.Resolve(
                task.ScheduledFor ?? task.PlannedStart,
                dto.ResultYear ?? task.ResultYear,
                _clock.UtcNow);
        }

        task.UpdatedAt = _clock.UtcNow;
        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        return FieldWorkMapper.ToTaskDto(updated, language);
    }

    public async Task<TaskDto> CompleteAsync(
        string id,
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
            return FieldWorkMapper.ToTaskDto(task, language);
        }

        var now = _clock.UtcNow;
        task.Status = FieldTaskStatus.Done;
        task.CompletedAt = now;
        task.CompletedByUserId = userId;
        task.UpdatedAt = now;
        Record(task, "completed", userId, now);
        // Complete does NOT create a WorkRecord. Chronologio emits compact history when no link.
        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        return FieldWorkMapper.ToTaskDto(updated, language);
    }

    public async Task<TaskDto> SkipAsync(
        string id,
        SkipTaskDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanOperateTaskAsync(task, userId, userRole, cancellationToken);

        if (task.Status.IsTerminal())
        {
            throw new ValidationException("Task is already closed.");
        }

        var now = _clock.UtcNow;
        task.Status = FieldTaskStatus.Skipped;
        task.SkippedAt = now;
        task.SkippedReason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim();
        task.UpdatedAt = now;
        Record(task, "skipped", userId, now, task.SkippedReason);
        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        return FieldWorkMapper.ToTaskDto(updated, language);
    }

    public async Task<TaskDto> LinkWorkRecordAsync(
        string id,
        LinkWorkRecordDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.WorkRecordId))
        {
            throw new ValidationException("WorkRecordId is required.");
        }

        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanOperateTaskAsync(task, userId, userRole, cancellationToken);

        var work = await _workRecords.GetByIdAsync(dto.WorkRecordId, cancellationToken)
            ?? throw new NotFoundException("Work record not found.");

        await _auth.EnsureCanViewFieldWorkAsync(work.FieldId, userId, userRole, cancellationToken);
        if (!string.Equals(work.FieldId, task.FieldId, StringComparison.Ordinal))
        {
            throw new ValidationException("Work record and task must belong to the same field.");
        }

        var now = _clock.UtcNow;
        work.TaskId = task.Id;
        work.UpdatedAt = now;
        await _workRecords.UpdateAsync(work, cancellationToken);

        task.LinkedWorkRecordId = work.Id;
        task.LatestExecutionId = work.Id;
        if (task.Status == FieldTaskStatus.Planned)
        {
            task.Status = FieldTaskStatus.Done;
            task.CompletedAt ??= work.CompletedAt;
            task.CompletedByUserId ??= userId;
            Record(task, "completed", userId, now, "linked_work_record");
        }

        task.UpdatedAt = now;
        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        return FieldWorkMapper.ToTaskDto(updated, language);
    }

    public async Task<TaskDto> UndoCompleteAsync(
        string id,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var task = await RequireTaskAsync(id, cancellationToken);
        await _auth.EnsureCanCreateOrEditTaskAsync(task.FieldId, userId, userRole, cancellationToken);

        if (task.Status != FieldTaskStatus.Done)
        {
            throw new ValidationException("Only done tasks can be undone.");
        }

        var now = _clock.UtcNow;
        task.Status = FieldTaskStatus.Planned;
        task.CompletedAt = null;
        task.CompletedByUserId = null;
        task.UpdatedAt = now;
        Record(task, "reopened", userId, now);
        var updated = await _tasks.UpdateAsync(task, cancellationToken);
        return FieldWorkMapper.ToTaskDto(updated, language);
    }

    private async Task<FieldTask> RequireTaskAsync(string id, CancellationToken cancellationToken)
    {
        return await _tasks.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Task not found.");
    }

    private static void Record(FieldTask task, string action, string actorId, DateTime at, string? comment = null)
    {
        task.Activity.Add(new FieldTaskActivity
        {
            Action = action,
            ActorId = actorId,
            OccurredAt = at,
            Comment = comment
        });
    }

    private static bool IsTodayOrOverdue(FieldTask task, DateTime today)
    {
        var date = (task.ScheduledFor ?? task.PlannedStart)?.Date;
        if (date is null)
        {
            return task.TimingBucket is TaskTimingBucket.Today;
        }

        return date <= today;
    }

    private static bool IsUpcoming(FieldTask task, DateTime today)
    {
        var date = (task.ScheduledFor ?? task.PlannedStart)?.Date;
        if (date is null)
        {
            return task.TimingBucket is TaskTimingBucket.Tomorrow or TaskTimingBucket.ThisWeek or TaskTimingBucket.Later;
        }

        return date > today;
    }

    private static DateTime? ResolveDateFromBucket(string? bucket, DateTime now)
    {
        var b = TaskTimingBucketExtensions.FromApiString(bucket) ?? TaskTimingBucket.Later;
        return b switch
        {
            TaskTimingBucket.Today => now.Date,
            TaskTimingBucket.Tomorrow => now.Date.AddDays(1),
            TaskTimingBucket.ThisWeek => now.Date.AddDays(3),
            _ => null
        };
    }

    private static TaskTimingBucket InferTimingBucket(DateTime? scheduledFor, DateTime now)
    {
        if (scheduledFor is null)
        {
            return TaskTimingBucket.Later;
        }

        var date = scheduledFor.Value.Date;
        var today = now.Date;
        if (date <= today)
        {
            return TaskTimingBucket.Today;
        }

        if (date == today.AddDays(1))
        {
            return TaskTimingBucket.Tomorrow;
        }

        var endOfWeek = today.AddDays(7 - (int)today.DayOfWeek);
        if (date <= endOfWeek)
        {
            return TaskTimingBucket.ThisWeek;
        }

        return TaskTimingBucket.Later;
    }
}
