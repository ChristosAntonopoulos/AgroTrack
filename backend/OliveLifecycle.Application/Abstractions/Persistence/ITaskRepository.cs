using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface ITaskRepository : IRepository<TaskItem, string>
{
    Task<IEnumerable<TaskItem>> GetByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default);
    Task<IEnumerable<TaskItem>> GetByFieldIdsAsync(IEnumerable<string> fieldIds, CancellationToken cancellationToken = default);
    Task<IEnumerable<TaskItem>> GetByAssignedToAsync(string assignedTo, CancellationToken cancellationToken = default);
    Task<IEnumerable<TaskItem>> GetByFieldIdAndStatusAsync(string fieldId, string status, CancellationToken cancellationToken = default);
}
