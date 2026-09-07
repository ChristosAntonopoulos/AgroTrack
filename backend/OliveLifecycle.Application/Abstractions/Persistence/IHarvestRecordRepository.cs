using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IHarvestRecordRepository : IRepository<HarvestRecord, string>
{
    Task<IEnumerable<HarvestRecord>> GetByOwnerIdAsync(string ownerId, CancellationToken cancellationToken = default);
    Task<IEnumerable<HarvestRecord>> GetByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default);
    Task<IEnumerable<HarvestRecord>> GetByFieldIdsAsync(IEnumerable<string> fieldIds, CancellationToken cancellationToken = default);
}
