using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Infrastructure.Repositories;

public interface ILifecycleRepository
{
    Task<Lifecycle?> GetByFieldIdAsync(string fieldId);
    Task<Lifecycle> CreateAsync(Lifecycle lifecycle);
    Task<Lifecycle> UpdateAsync(Lifecycle lifecycle);
}
