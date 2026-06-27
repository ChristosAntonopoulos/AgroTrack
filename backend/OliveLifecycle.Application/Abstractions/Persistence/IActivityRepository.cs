using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IActivityRepository
{
    Task<Activity> CreateAsync(Activity activity, CancellationToken cancellationToken = default);
    Task<IEnumerable<Activity>> GetByFieldIdAsync(string fieldId, int limit = 50, CancellationToken cancellationToken = default);
}
