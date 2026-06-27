using OliveLifecycle.Application.DTOs.Task;

namespace OliveLifecycle.Application.Services;

public interface ITaskService
{
    Task<TaskDto> CreateTaskAsync(CreateTaskDto createTaskDto, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<TaskDto?> GetTaskByIdAsync(string id, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<IEnumerable<TaskDto>> GetTasksByFieldIdAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<IEnumerable<TaskDto>> GetTasksByAssignedToAsync(string assignedTo, CancellationToken cancellationToken = default);
    Task<IEnumerable<TaskDto>> GetTasksForUserAsync(string userId, string userRole, CancellationToken cancellationToken = default);
    Task<TaskDto> UpdateTaskStatusAsync(string id, string status, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<TaskDto> AddEvidenceAsync(string id, AddEvidenceDto evidenceDto, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<TaskDto> AssignTaskAsync(string id, string assignedTo, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<TaskDto> ApproveTaskAsync(string id, string? note, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<TaskDto> RejectTaskAsync(string id, string? note, string userId, string userRole, CancellationToken cancellationToken = default);
}
