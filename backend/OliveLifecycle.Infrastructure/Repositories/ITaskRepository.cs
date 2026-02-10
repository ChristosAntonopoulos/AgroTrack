using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Infrastructure.Repositories;

public interface ITaskRepository
{
    Task<Task?> GetByIdAsync(string id);
    Task<IEnumerable<Task>> GetByFieldIdAsync(string fieldId);
    Task<IEnumerable<Task>> GetByAssignedToAsync(string assignedTo);
    Task<IEnumerable<Task>> GetByFieldIdAndStatusAsync(string fieldId, string status);
    Task<Task> CreateAsync(Task task);
    Task<Task> UpdateAsync(Task task);
    Task<bool> DeleteAsync(string id);
}
