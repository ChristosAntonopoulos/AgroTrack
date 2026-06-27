using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface ILifecycleRepository : IRepository<Lifecycle, string>
{
    Task<Lifecycle?> GetByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default);
}
