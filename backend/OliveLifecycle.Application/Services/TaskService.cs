using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Task;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _taskRepository;
    private readonly IFieldAccessService _fieldAccessService;
    private readonly ILifecycleService _lifecycleService;
    private readonly IActivityService _activityService;
    private readonly IFieldRepository _fieldRepository;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ILogger<TaskService> _logger;

    public TaskService(
        ITaskRepository taskRepository,
        IFieldAccessService fieldAccessService,
        ILifecycleService lifecycleService,
        IActivityService activityService,
        IFieldRepository fieldRepository,
        IDateTimeProvider dateTimeProvider,
        ILogger<TaskService> logger)
    {
        _taskRepository = taskRepository;
        _fieldAccessService = fieldAccessService;
        _lifecycleService = lifecycleService;
        _activityService = activityService;
        _fieldRepository = fieldRepository;
        _dateTimeProvider = dateTimeProvider;
        _logger = logger;
    }

    public async Task<TaskDto> CreateTaskAsync(CreateTaskDto createTaskDto, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(createTaskDto.FieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        if (!await _fieldAccessService.CanUserModifyFieldAsync(createTaskDto.FieldId, userId, cancellationToken) && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to create tasks on this field.");
        }

        if (!await _lifecycleService.ValidateTaskForLifecycleAsync(createTaskDto.FieldId, createTaskDto.LifecycleYear, cancellationToken))
        {
            throw new ValidationException(
                $"Task lifecycle year '{createTaskDto.LifecycleYear}' does not match field's current lifecycle year.");
        }

        var now = _dateTimeProvider.UtcNow;
        var task = new TaskItem
        {
            FieldId = createTaskDto.FieldId,
            TemplateId = createTaskDto.TemplateId,
            Type = createTaskDto.Type,
            Title = createTaskDto.Title,
            Description = createTaskDto.Description,
            LifecycleYear = createTaskDto.LifecycleYear,
            AssignedTo = createTaskDto.AssignedTo,
            Status = WorkTaskStatus.Pending,
            ApprovalStatus = ApprovalStatus.NotRequired,
            ScheduledStart = createTaskDto.ScheduledStart,
            ScheduledEnd = createTaskDto.ScheduledEnd,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _taskRepository.CreateAsync(task, cancellationToken);
        _logger.LogInformation("Task created: {TaskId} for field {FieldId}", created.Id, createTaskDto.FieldId);
        return TaskMapper.ToDto(created);
    }

    public async Task<TaskDto?> GetTaskByIdAsync(string id, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        var task = await _taskRepository.GetByIdAsync(id, cancellationToken);
        if (task == null)
        {
            return null;
        }

        if (!await CanUserAccessTaskAsync(task, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this task.");
        }

        return TaskMapper.ToDto(task);
    }

    public async Task<IEnumerable<TaskDto>> GetTasksByFieldIdAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var tasks = await _taskRepository.GetByFieldIdAsync(fieldId, cancellationToken);
        return tasks.Select(TaskMapper.ToDto);
    }

    public async Task<IEnumerable<TaskDto>> GetTasksByAssignedToAsync(string assignedTo, CancellationToken cancellationToken = default)
    {
        var tasks = await _taskRepository.GetByAssignedToAsync(assignedTo, cancellationToken);
        return tasks.Select(TaskMapper.ToDto);
    }

    public async Task<IEnumerable<TaskDto>> GetTasksForUserAsync(string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (userRole == Roles.FieldOwner || userRole == Roles.Administrator)
        {
            var fields = await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken);
            var fieldIds = fields.Select(f => f.Id).ToList();
            if (fieldIds.Count == 0)
            {
                return Enumerable.Empty<TaskDto>();
            }

            var tasks = await _taskRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);
            return tasks.Select(TaskMapper.ToDto);
        }

        if (userRole == Roles.Producer)
        {
            var tasks = await _taskRepository.GetByAssignedToAsync(userId, cancellationToken);
            return tasks.Select(TaskMapper.ToDto);
        }

        return Enumerable.Empty<TaskDto>();
    }

    public async Task<TaskDto> UpdateTaskStatusAsync(string id, string status, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        var task = await _taskRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Task not found.");

        if (!await CanUserAccessTaskAsync(task, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this task.");
        }

        var previousStatus = task.Status.ToApiString();
        var newStatus = WorkTaskStatusExtensions.FromApiString(status);
        task.Status = newStatus;

        if (newStatus == WorkTaskStatus.InProgress && task.ActualStart == null)
        {
            task.ActualStart = _dateTimeProvider.UtcNow;
        }
        else if (newStatus == WorkTaskStatus.Completed && task.ActualEnd == null)
        {
            task.ActualEnd = _dateTimeProvider.UtcNow;
            if (!string.IsNullOrEmpty(task.AssignedTo))
            {
                task.ApprovalStatus = ApprovalStatus.Pending;
            }
        }

        var updated = await _taskRepository.UpdateAsync(task, cancellationToken);
        await _activityService.RecordAsync(
            task.FieldId,
            "task_status_changed",
            $"Task '{task.Title}' status changed from {previousStatus} to {status}",
            userId,
            task.Id,
            new Dictionary<string, string>
            {
                ["previousStatus"] = previousStatus,
                ["newStatus"] = status
            },
            cancellationToken);
        _logger.LogInformation("Task {TaskId} status updated from {PreviousStatus} to {NewStatus}", id, previousStatus, status);
        return TaskMapper.ToDto(updated);
    }

    public async Task<TaskDto> AddEvidenceAsync(string id, AddEvidenceDto evidenceDto, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        var task = await _taskRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Task not found.");

        if (!await CanUserAccessTaskAsync(task, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this task.");
        }

        task.Evidence.Add(new Evidence
        {
            PhotoUrl = evidenceDto.PhotoUrl,
            Notes = evidenceDto.Notes,
            Kind = evidenceDto.Kind,
            Timestamp = _dateTimeProvider.UtcNow
        });

        var updated = await _taskRepository.UpdateAsync(task, cancellationToken);
        await _activityService.RecordAsync(
            task.FieldId,
            "evidence_added",
            $"Evidence added to task '{task.Title}'",
            userId,
            task.Id,
            cancellationToken: cancellationToken);
        _logger.LogInformation("Evidence added to task {TaskId}", id);
        return TaskMapper.ToDto(updated);
    }

    public async Task<TaskDto> AssignTaskAsync(string id, string assignedTo, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        var task = await _taskRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Task not found.");

        if (!await _fieldAccessService.CanUserModifyFieldAsync(task.FieldId, userId, cancellationToken) && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to assign tasks on this field.");
        }

        task.AssignedTo = assignedTo;
        var updated = await _taskRepository.UpdateAsync(task, cancellationToken);
        await _activityService.RecordAsync(
            task.FieldId,
            "task_assigned",
            $"Task '{task.Title}' assigned",
            userId,
            task.Id,
            new Dictionary<string, string> { ["assignedTo"] = assignedTo },
            cancellationToken);
        _logger.LogInformation("Task {TaskId} assigned to {AssignedTo}", id, assignedTo);
        return TaskMapper.ToDto(updated);
    }

    public async Task<TaskDto> ApproveTaskAsync(string id, string? note, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        var task = await _taskRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Task not found.");

        if (!await _fieldAccessService.CanUserModifyFieldAsync(task.FieldId, userId, cancellationToken) && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to approve tasks on this field.");
        }

        if (task.ApprovalStatus != ApprovalStatus.Pending)
        {
            throw new ValidationException("Task is not pending approval.");
        }

        task.ApprovalStatus = ApprovalStatus.Approved;
        task.ApprovalNote = note;
        var updated = await _taskRepository.UpdateAsync(task, cancellationToken);
        await _activityService.RecordAsync(
            task.FieldId,
            "task_approved",
            $"Task '{task.Title}' approved",
            userId,
            task.Id,
            cancellationToken: cancellationToken);
        return TaskMapper.ToDto(updated);
    }

    public async Task<TaskDto> RejectTaskAsync(string id, string? note, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        var task = await _taskRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Task not found.");

        if (!await _fieldAccessService.CanUserModifyFieldAsync(task.FieldId, userId, cancellationToken) && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to reject tasks on this field.");
        }

        if (task.ApprovalStatus != ApprovalStatus.Pending)
        {
            throw new ValidationException("Task is not pending approval.");
        }

        task.ApprovalStatus = ApprovalStatus.Rejected;
        task.ApprovalNote = note;
        task.Status = WorkTaskStatus.InProgress;
        var updated = await _taskRepository.UpdateAsync(task, cancellationToken);
        await _activityService.RecordAsync(
            task.FieldId,
            "task_rejected",
            $"Task '{task.Title}' rejected",
            userId,
            task.Id,
            cancellationToken: cancellationToken);
        return TaskMapper.ToDto(updated);
    }

    private async Task<bool> CanUserAccessTaskAsync(TaskItem task, string userId, string userRole, CancellationToken cancellationToken)
    {
        if (await _fieldAccessService.CanUserAccessFieldAsync(task.FieldId, userId, userRole, cancellationToken))
        {
            return true;
        }

        return task.AssignedTo == userId;
    }
}
