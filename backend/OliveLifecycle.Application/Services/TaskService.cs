using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.DTOs.Task;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _taskRepository;
    private readonly ITaskTemplateRepository _taskTemplateRepository;
    private readonly IFieldAccessService _fieldAccessService;
    private readonly ILifecycleService _lifecycleService;
    private readonly IActivityService _activityService;
    private readonly IFieldRepository _fieldRepository;
    private readonly IFamilyMemberRepository _familyMembers;
    private readonly IGeospatialJobQueue _geospatialJobQueue;
    private readonly IFinancialEntryService _financialEntryService;
    private readonly IMediaAttachmentService _mediaAttachmentService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ILogger<TaskService> _logger;

    public TaskService(
        ITaskRepository taskRepository,
        ITaskTemplateRepository taskTemplateRepository,
        IFieldAccessService fieldAccessService,
        ILifecycleService lifecycleService,
        IActivityService activityService,
        IFieldRepository fieldRepository,
        IFamilyMemberRepository familyMembers,
        IGeospatialJobQueue geospatialJobQueue,
        IFinancialEntryService financialEntryService,
        IMediaAttachmentService mediaAttachmentService,
        IDateTimeProvider dateTimeProvider,
        ILogger<TaskService> logger)
    {
        _taskRepository = taskRepository;
        _taskTemplateRepository = taskTemplateRepository;
        _fieldAccessService = fieldAccessService;
        _lifecycleService = lifecycleService;
        _activityService = activityService;
        _fieldRepository = fieldRepository;
        _familyMembers = familyMembers;
        _geospatialJobQueue = geospatialJobQueue;
        _financialEntryService = financialEntryService;
        _mediaAttachmentService = mediaAttachmentService;
        _dateTimeProvider = dateTimeProvider;
        _logger = logger;
    }

    public async Task<TaskDto> CreateTaskAsync(CreateTaskDto createTaskDto, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(createTaskDto.FieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var canOwn = await _fieldAccessService.CanUserModifyFieldAsync(createTaskDto.FieldId, userId, cancellationToken);
        var familyCanCreate = await _fieldAccessService.CanFamilyWriteModuleAsync(
            createTaskDto.FieldId, userId, FamilyModules.Tasks, requireCreateLevel: true, cancellationToken);
        if (!canOwn && userRole != Roles.Administrator && !familyCanCreate)
        {
            throw new ForbiddenException("You do not have permission to create tasks on this field.");
        }

        var field = await _fieldRepository.GetByIdAsync(createTaskDto.FieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        var lifecycleYear = string.IsNullOrWhiteSpace(createTaskDto.LifecycleYear)
            ? field.CurrentLifecycleYear
            : createTaskDto.LifecycleYear.Trim();

        if (!await _lifecycleService.ValidateTaskForLifecycleAsync(createTaskDto.FieldId, lifecycleYear, cancellationToken))
        {
            throw new ValidationException(
                $"Task lifecycle year '{lifecycleYear}' does not match field's current lifecycle year.");
        }

        TaskTemplate? template = null;
        if (!string.IsNullOrWhiteSpace(createTaskDto.TemplateId))
        {
            template = await _taskTemplateRepository.GetByIdAsync(createTaskDto.TemplateId, cancellationToken);
        }

        var harvestPhase = HarvestPhaseExtensions.FromApiString(createTaskDto.HarvestPhase)
            ?? template?.HarvestPhase
            ?? HarvestPhaseCatalog.FromTypeOrTitle(createTaskDto.Type, createTaskDto.Title)
            ?? HarvestPhaseCatalog.FromTypeOrTitle(template?.Type, template?.Title);

        var now = _dateTimeProvider.UtcNow;
        var task = new TaskItem
        {
            FieldId = createTaskDto.FieldId,
            TemplateId = createTaskDto.TemplateId,
            Type = createTaskDto.Type,
            Title = createTaskDto.Title,
            Description = createTaskDto.Description,
            LifecycleYear = lifecycleYear,
            HarvestPhase = harvestPhase,
            AssignedTo = createTaskDto.AssignedTo,
            Status = WorkTaskStatus.Pending,
            ApprovalStatus = ApprovalStatus.NotRequired,
            ScheduledStart = createTaskDto.ScheduledStart,
            ScheduledEnd = createTaskDto.ScheduledEnd,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _taskRepository.CreateAsync(task, cancellationToken);
        await _activityService.RecordAsync(
            created.FieldId,
            "task_created",
            $"Task '{created.Title}' created",
            userId,
            created.Id,
            cancellationToken: cancellationToken);
        await QueueWeatherAdviceAsync(created.FieldId, cancellationToken);
        _logger.LogInformation("Task created: {TaskId} for field {FieldId}", created.Id, createTaskDto.FieldId);
        return TaskMapper.ToDto(created);
    }

    public async Task<TaskDto> RecordCompletedWorkAsync(
        RecordCompletedWorkDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(dto.FieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var canOwn = await _fieldAccessService.CanUserModifyFieldAsync(dto.FieldId, userId, cancellationToken);
        var familyCanCreate = await _fieldAccessService.CanFamilyWriteModuleAsync(
            dto.FieldId, userId, FamilyModules.Tasks, requireCreateLevel: true, cancellationToken);
        if (!canOwn && userRole != Roles.Administrator && !familyCanCreate)
        {
            throw new ForbiddenException("You do not have permission to record work on this field.");
        }

        var field = await _fieldRepository.GetByIdAsync(dto.FieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        var lifecycleYear = string.IsNullOrWhiteSpace(dto.LifecycleYear)
            ? field.CurrentLifecycleYear
            : dto.LifecycleYear.Trim();

        TaskTemplate? template = null;
        if (!string.IsNullOrWhiteSpace(dto.TemplateId))
        {
            template = await _taskTemplateRepository.GetByIdAsync(dto.TemplateId, cancellationToken);
        }

        var harvestPhase = HarvestPhaseExtensions.FromApiString(dto.HarvestPhase)
            ?? template?.HarvestPhase
            ?? HarvestPhaseCatalog.FromTypeOrTitle(dto.Type, dto.Title)
            ?? HarvestPhaseCatalog.FromTypeOrTitle(template?.Type, template?.Title);

        var now = _dateTimeProvider.UtcNow;
        var occurredAt = dto.OccurredAt?.ToUniversalTime() ?? now;
        var dayStart = new DateTime(occurredAt.Year, occurredAt.Month, occurredAt.Day, 0, 0, 0, DateTimeKind.Utc);

        var task = new TaskItem
        {
            FieldId = dto.FieldId,
            TemplateId = dto.TemplateId,
            Type = string.IsNullOrWhiteSpace(dto.Type) ? (template?.Type ?? "work") : dto.Type,
            Title = string.IsNullOrWhiteSpace(dto.Title) ? (template?.Title ?? "Work") : dto.Title,
            Description = dto.Description,
            LifecycleYear = lifecycleYear,
            HarvestPhase = harvestPhase,
            AssignedTo = string.IsNullOrWhiteSpace(dto.AssignedTo) ? userId : dto.AssignedTo,
            Status = WorkTaskStatus.Completed,
            ApprovalStatus = ApprovalStatus.NotRequired,
            ScheduledStart = dayStart,
            ScheduledEnd = occurredAt,
            ActualStart = dayStart,
            ActualEnd = occurredAt,
            Cost = dto.CostAmount,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _taskRepository.CreateAsync(task, cancellationToken);

        if (dto.CostAmount is > 0)
        {
            await _financialEntryService.CreateAsync(new CreateFinancialEntryDto
            {
                FieldId = dto.FieldId,
                TaskId = created.Id,
                Kind = "expense",
                Amount = dto.CostAmount,
                Currency = dto.Currency,
                Category = string.IsNullOrWhiteSpace(dto.CostCategory) ? "labor" : dto.CostCategory,
                Description = string.IsNullOrWhiteSpace(created.Title) ? "Work cost" : created.Title,
                OccurredOn = occurredAt
            }, userId, userRole, cancellationToken);
        }

        var mediaUrls = (dto.MediaUrls ?? new List<string>())
            .Where(u => !string.IsNullOrWhiteSpace(u))
            .Select(u => u.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(MediaAttachmentService.MaxImagesPerOwner)
            .ToList();

        if (mediaUrls.Count > 0)
        {
            await _mediaAttachmentService.AttachUrlsAsync(
                MediaOwnerType.Task.ToApiString(),
                created.Id,
                created.FieldId,
                mediaUrls,
                userId,
                userRole,
                cancellationToken);

            foreach (var url in mediaUrls)
            {
                created.Evidence.Add(new Evidence
                {
                    PhotoUrl = url,
                    Kind = "photo",
                    Timestamp = occurredAt
                });
            }

            created.UpdatedAt = now;
            created = await _taskRepository.UpdateAsync(created, cancellationToken);
        }

        await _activityService.RecordAsync(
            created.FieldId,
            "task_completed",
            $"Work '{created.Title}' recorded",
            userId,
            created.Id,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Completed work recorded: {TaskId} for field {FieldId}", created.Id, dto.FieldId);
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

        await EnsureFamilyModuleOrNonFamilyAsync(fieldId, userId, FamilyModules.Tasks, cancellationToken);

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
        var fieldIds = new HashSet<string>(StringComparer.Ordinal);

        if (userRole == Roles.FieldOwner || userRole == Roles.Administrator)
        {
            foreach (var field in await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken))
            {
                fieldIds.Add(field.Id);
            }
        }

        var familyAccesses = await _familyMembers.GetActiveByLinkedUserIdAllAsync(userId, cancellationToken);
        foreach (var access in familyAccesses.Where(a =>
                     a.Modules.Any(m => string.Equals(m, FamilyModules.Tasks, StringComparison.OrdinalIgnoreCase))))
        {
            foreach (var field in await _fieldRepository.GetByOwnerIdAsync(access.OwnerUserId, cancellationToken))
            {
                fieldIds.Add(field.Id);
            }
        }

        if (fieldIds.Count > 0)
        {
            var ownedTasks = await _taskRepository.GetByFieldIdsAsync(fieldIds.ToList(), cancellationToken);
            if (userRole != Roles.Producer)
            {
                return ownedTasks.Select(TaskMapper.ToDto);
            }
        }

        if (userRole == Roles.Producer)
        {
            var assigned = await _taskRepository.GetByAssignedToAsync(userId, cancellationToken);
            if (fieldIds.Count == 0)
            {
                return assigned.Select(TaskMapper.ToDto);
            }

            var byField = await _taskRepository.GetByFieldIdsAsync(fieldIds.ToList(), cancellationToken);
            return byField.Concat(assigned).DistinctBy(t => t.Id).Select(TaskMapper.ToDto);
        }

        return fieldIds.Count == 0
            ? Enumerable.Empty<TaskDto>()
            : (await _taskRepository.GetByFieldIdsAsync(fieldIds.ToList(), cancellationToken)).Select(TaskMapper.ToDto);
    }

    public async Task<TaskDto> UpdateTaskStatusAsync(string id, string status, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        var task = await _taskRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Task not found.");

        if (!await CanUserAccessTaskAsync(task, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this task.");
        }

        var family = await _fieldAccessService.GetFamilyAccessForFieldAsync(task.FieldId, userId, cancellationToken);
        if (family != null
            && !await _fieldAccessService.CanUserModifyFieldAsync(task.FieldId, userId, cancellationToken)
            && userRole != Roles.Administrator)
        {
            if (!family.Modules.Any(m => string.Equals(m, FamilyModules.Tasks, StringComparison.OrdinalIgnoreCase)))
            {
                throw new ForbiddenException("You do not have access to tasks for this field.");
            }

            if (!FamilyAccessLevels.CanWrite(family.AccessLevel))
            {
                throw new ForbiddenException("You can only view tasks on this field.");
            }

            // help: may complete/update assigned tasks; work: any task on the grove
            if (!FamilyAccessLevels.CanCreateContent(family.AccessLevel)
                && !string.Equals(task.AssignedTo, userId, StringComparison.Ordinal))
            {
                throw new ForbiddenException("You can only update tasks assigned to you.");
            }
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
        await QueueWeatherAdviceAsync(task.FieldId, cancellationToken);
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

    /// <summary>
    /// Asks the geospatial worker to re-check the field's task weather warnings. Advice is
    /// a nice-to-have, so a queueing failure must never fail the task operation itself.
    /// </summary>
    private async Task QueueWeatherAdviceAsync(string fieldId, CancellationToken cancellationToken)
    {
        try
        {
            await _geospatialJobQueue.EnqueueTaskConditionsAsync(fieldId, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Could not queue task weather evaluation for field {FieldId}", fieldId);
        }
    }

    private async Task<bool> CanUserAccessTaskAsync(TaskItem task, string userId, string userRole, CancellationToken cancellationToken)
    {
        if (task.AssignedTo == userId)
        {
            return true;
        }

        if (!await _fieldAccessService.CanUserAccessFieldAsync(task.FieldId, userId, userRole, cancellationToken))
        {
            return false;
        }

        return await HasNonFamilyOrModuleAsync(task.FieldId, userId, FamilyModules.Tasks, cancellationToken);
    }

    private async Task EnsureFamilyModuleOrNonFamilyAsync(
        string fieldId,
        string userId,
        string module,
        CancellationToken cancellationToken)
    {
        if (!await HasNonFamilyOrModuleAsync(fieldId, userId, module, cancellationToken))
        {
            throw new ForbiddenException($"You do not have access to {module} for this field.");
        }
    }

    private async Task<bool> HasNonFamilyOrModuleAsync(
        string fieldId,
        string userId,
        string module,
        CancellationToken cancellationToken)
    {
        if (await _fieldAccessService.CanUserModifyFieldAsync(fieldId, userId, cancellationToken))
        {
            return true;
        }

        if (await _fieldAccessService.HasCapacityAsync(fieldId, userId, FieldCapacities.Work, cancellationToken)
            || await _fieldAccessService.HasCapacityAsync(fieldId, userId, FieldCapacities.View, cancellationToken)
            || await _fieldAccessService.HasCapacityAsync(fieldId, userId, FieldCapacities.Help, cancellationToken)
            || await _fieldAccessService.HasCapacityAsync(fieldId, userId, FieldCapacities.Advise, cancellationToken))
        {
            return true;
        }

        var family = await _fieldAccessService.GetFamilyAccessForFieldAsync(fieldId, userId, cancellationToken);
        if (family == null)
        {
            return true;
        }

        return family.Modules.Any(m => string.Equals(m, module, StringComparison.OrdinalIgnoreCase));
    }
}
