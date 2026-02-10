using OliveLifecycle.Application.DTOs.Task;

namespace OliveLifecycle.Application.Services;

public interface ITaskService
{
    Task<TaskDto> CreateTaskAsync(CreateTaskDto createTaskDto);
    Task<TaskDto?> GetTaskByIdAsync(string id);
    Task<IEnumerable<TaskDto>> GetTasksByFieldIdAsync(string fieldId);
    Task<IEnumerable<TaskDto>> GetTasksByAssignedToAsync(string assignedTo);
    Task<TaskDto> UpdateTaskStatusAsync(string id, string status);
    Task<TaskDto> AddEvidenceAsync(string id, AddEvidenceDto evidenceDto);
    Task<TaskDto> AssignTaskAsync(string id, string assignedTo);
}
