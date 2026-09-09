using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IActivityRepository
{
    Task<Activity> CreateAsync(Activity activity, CancellationToken cancellationToken = default);
    Task<IEnumerable<Activity>> GetByFieldIdAsync(string fieldId, int limit = 50, CancellationToken cancellationToken = default);
    Task<IEnumerable<Activity>> GetByActorUserIdAsync(
        string actorUserId,
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        int limit = 200,
        CancellationToken cancellationToken = default);
    Task<IEnumerable<Activity>> GetByFieldIdsAsync(
        IEnumerable<string> fieldIds,
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        int limit = 50,
        CancellationToken cancellationToken = default);
}
