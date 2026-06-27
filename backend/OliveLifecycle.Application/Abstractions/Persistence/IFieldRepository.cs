using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IFieldRepository : IRepository<Field, string>
{
    Task<IEnumerable<Field>> GetByOwnerIdAsync(string ownerId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Field>> GetByIdsAsync(IEnumerable<string> fieldIds, CancellationToken cancellationToken = default);
    Task<IEnumerable<Field>> GetByAssignedProducerIdAsync(string producerId, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string id, CancellationToken cancellationToken = default);
}
