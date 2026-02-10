using OliveLifecycle.Application.DTOs.Task;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Repositories;

namespace OliveLifecycle.Application.Services;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _taskRepository;
    private readonly IFieldRepository _fieldRepository;
    private readonly ILifecycleService _lifecycleService;
    private readonly ILogger<TaskService> _logger;

    public TaskService(
        ITaskRepository taskRepository,
        IFieldRepository fieldRepository,
        ILifecycleService lifecycleService,
        ILogger<TaskService> logger)
    {
        _taskRepository = taskRepository;
        _fieldRepository = fieldRepository;
        _lifecycleService = lifecycleService;
        _logger = logger;
    }

    public async Task<TaskDto> CreateTaskAsync(CreateTaskDto createTaskDto)
    {
        // Validate field exists
        var field = await _fieldRepository.GetByIdAsync(createTaskDto.FieldId);
        if (field == null)
        {
            throw new KeyNotFoundException("Field not found.");
        }

        // Validate lifecycle year matches current field lifecycle
        var isValid = await _lifecycleService.ValidateTaskForLifecycleAsync(
            createTaskDto.FieldId, 
            createTaskDto.LifecycleYear);
        
        if (!isValid)
        {
            throw new InvalidOperationException(
                $"Task lifecycle year '{createTaskDto.LifecycleYear}' does not match field's current lifecycle year.");
        }

        var task = new Task
        {
            FieldId = createTaskDto.FieldId,
            TemplateId = createTaskDto.TemplateId,
            Type = createTaskDto.Type,
            Title = createTaskDto.Title,
            Description = createTaskDto.Description,
            LifecycleYear = createTaskDto.LifecycleYear,
            AssignedTo = createTaskDto.AssignedTo,
            Status = "pending",
            ScheduledStart = createTaskDto.ScheduledStart,
            ScheduledEnd = createTaskDto.ScheduledEnd,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await _taskRepository.CreateAsync(task);
        _logger.LogInformation("Task created: {TaskId} for field {FieldId}", created.Id, createTaskDto.FieldId);
        return MapToDto(created);
    }

    public async Task<TaskDto?> GetTaskByIdAsync(string id)
    {
        var task = await _taskRepository.GetByIdAsync(id);
        return task != null ? MapToDto(task) : null;
    }

    public async Task<IEnumerable<TaskDto>> GetTasksByFieldIdAsync(string fieldId)
    {
        var tasks = await _taskRepository.GetByFieldIdAsync(fieldId);
        return tasks.Select(MapToDto);
    }

    public async Task<IEnumerable<TaskDto>> GetTasksByAssignedToAsync(string assignedTo)
    {
        var tasks = await _taskRepository.GetByAssignedToAsync(assignedTo);
        return tasks.Select(MapToDto);
    }

    public async Task<TaskDto> UpdateTaskStatusAsync(string id, string status)
    {
        var task = await _taskRepository.GetByIdAsync(id);
        if (task == null)
        {
            throw new KeyNotFoundException("Task not found.");
        }

        var previousStatus = task.Status;
        task.Status = status;

        // Update timestamps based on status
        if (status == "in_progress" && task.ActualStart == null)
        {
            task.ActualStart = DateTime.UtcNow;
        }
        else if (status == "completed" && task.ActualEnd == null)
        {
            task.ActualEnd = DateTime.UtcNow;
        }

        var updated = await _taskRepository.UpdateAsync(task);
        _logger.LogInformation("Task {TaskId} status updated from {PreviousStatus} to {NewStatus}", 
            id, previousStatus, status);
        return MapToDto(updated);
    }

    public async Task<TaskDto> AddEvidenceAsync(string id, AddEvidenceDto evidenceDto)
    {
        var task = await _taskRepository.GetByIdAsync(id);
        if (task == null)
        {
            throw new KeyNotFoundException("Task not found.");
        }

        var evidence = new Evidence
        {
            PhotoUrl = evidenceDto.PhotoUrl,
            Notes = evidenceDto.Notes,
            Timestamp = DateTime.UtcNow
        };

        task.Evidence.Add(evidence);
        var updated = await _taskRepository.UpdateAsync(task);
        _logger.LogInformation("Evidence added to task {TaskId}", id);
        return MapToDto(updated);
    }

    public async Task<TaskDto> AssignTaskAsync(string id, string assignedTo)
    {
        var task = await _taskRepository.GetByIdAsync(id);
        if (task == null)
        {
            throw new KeyNotFoundException("Task not found.");
        }

        task.AssignedTo = assignedTo;
        var updated = await _taskRepository.UpdateAsync(task);
        _logger.LogInformation("Task {TaskId} assigned to {AssignedTo}", id, assignedTo);
        return MapToDto(updated);
    }

    private static TaskDto MapToDto(Task task)
    {
        return new TaskDto
        {
            Id = task.Id,
            FieldId = task.FieldId,
            TemplateId = task.TemplateId,
            Type = task.Type,
            Title = task.Title,
            Description = task.Description,
            LifecycleYear = task.LifecycleYear,
            AssignedTo = task.AssignedTo,
            Status = task.Status,
            ScheduledStart = task.ScheduledStart,
            ScheduledEnd = task.ScheduledEnd,
            ActualStart = task.ActualStart,
            ActualEnd = task.ActualEnd,
            Cost = task.Cost,
            Evidence = task.Evidence.Select(e => new EvidenceDto
            {
                PhotoUrl = e.PhotoUrl,
                Notes = e.Notes,
                Timestamp = e.Timestamp
            }).ToList(),
            Notes = task.Notes,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt
        };
    }
}
