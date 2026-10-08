using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Application.Services;

public interface IWorkRecordService
{
    Task<WorkRecordDto> CreateAsync(
        CreateWorkRecordDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TaskDto>> FindMatchingPlannedTasksAsync(
        string fieldId,
        DateTime? completedAt,
        string? title,
        string? templateCode,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);
}

public class WorkRecordService : IWorkRecordService
{
    private readonly ITaskExecutionRepository _workRecords;
    private readonly IFieldTaskRepository _tasks;
    private readonly IFieldWorkAuthorizationService _auth;
    private readonly IDateTimeProvider _clock;
    private readonly IFieldStatusGuard _fieldStatusGuard;
    private readonly ITaskService _taskService;

    public WorkRecordService(
        ITaskExecutionRepository workRecords,
        IFieldTaskRepository tasks,
        IFieldWorkAuthorizationService auth,
        IDateTimeProvider clock,
        IFieldStatusGuard fieldStatusGuard,
        ITaskService taskService)
    {
        _workRecords = workRecords;
        _tasks = tasks;
        _auth = auth;
        _clock = clock;
        _fieldStatusGuard = fieldStatusGuard;
        _taskService = taskService;
    }

    public async Task<WorkRecordDto> CreateAsync(
        CreateWorkRecordDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.FieldId))
        {
            throw new ValidationException("FieldId is required.");
        }

        await _auth.EnsureCanCreateOrEditTaskAsync(dto.FieldId, userId, userRole, cancellationToken);
        await _fieldStatusGuard.EnsureAcceptsNewRecordsAsync(dto.FieldId, cancellationToken);

        var now = _clock.UtcNow;
        var completedAt = dto.CompletedAt ?? now;
        var resultYear = ResultYearResolver.Resolve(completedAt, dto.ResultYear, now);
        var title = string.IsNullOrWhiteSpace(dto.Title)
            ? (string.IsNullOrWhiteSpace(dto.TemplateCode)
                ? "Εργασία"
                : CuratedTaskTemplates.DisplayTitle(dto.TemplateCode, language))
            : dto.Title.Trim();

        var work = new TaskExecution
        {
            FieldId = dto.FieldId,
            ResultYear = resultYear,
            Title = title,
            TemplateCode = dto.TemplateCode,
            OwnerId = userId,
            StartedAt = dto.StartedAt,
            CompletedAt = completedAt,
            Outcome = TaskExecutionOutcome.Completed,
            CompletedByUserIds = [userId],
            Notes = dto.Notes,
            AttachmentIds = dto.AttachmentIds?.ToList() ?? [],
            RecordedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _workRecords.CreateAsync(work, cancellationToken);
        var dtoResult = FieldWorkMapper.ToWorkRecordDto(created, language);

        if (!string.IsNullOrWhiteSpace(dto.LinkedTaskId))
        {
            var linked = await _taskService.LinkWorkRecordAsync(
                dto.LinkedTaskId,
                new LinkWorkRecordDto { WorkRecordId = created.Id },
                userId,
                userRole,
                language,
                cancellationToken);
            dtoResult.LinkedTaskId = linked.Id;
            dtoResult.TaskId = linked.Id;
        }
        else if (dto.OfferPlannedTaskMatch)
        {
            dtoResult.MatchingPlannedTasks = (await FindMatchingPlannedTasksAsync(
                dto.FieldId,
                completedAt,
                title,
                dto.TemplateCode,
                userId,
                userRole,
                language,
                cancellationToken)).ToList();
        }

        return dtoResult;
    }

    public async Task<IReadOnlyList<TaskDto>> FindMatchingPlannedTasksAsync(
        string fieldId,
        DateTime? completedAt,
        string? title,
        string? templateCode,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);

        var planned = await _tasks.QueryAsync(
            new FieldTaskQuery
            {
                FieldId = fieldId,
                Statuses = [FieldTaskStatus.Planned]
            },
            cancellationToken);

        var day = (completedAt ?? _clock.UtcNow).Date;
        var matches = planned
            .Where(t =>
            {
                if (!string.IsNullOrWhiteSpace(templateCode)
                    && string.Equals(t.TemplateCode, templateCode, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                var scheduled = (t.ScheduledFor ?? t.PlannedStart)?.Date;
                if (scheduled == day)
                {
                    return true;
                }

                if (!string.IsNullOrWhiteSpace(title)
                    && string.Equals(t.Title, title, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                return false;
            })
            .Take(10)
            .Select(t => FieldWorkMapper.ToTaskDto(t, language))
            .ToList();

        return matches;
    }
}
