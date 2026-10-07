using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IBillingProfileRepository
{
    Task<BillingProfile?> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<BillingProfile> UpsertAsync(BillingProfile profile, CancellationToken cancellationToken = default);

    /// <summary>
    /// Atomically acquires a short field-creation lock for the user if not already held.
    /// Returns true when this caller holds the lock.
    /// </summary>
    Task<bool> TryAcquireFieldCreationLockAsync(
        string userId,
        DateTime lockUntilUtc,
        CancellationToken cancellationToken = default);

    Task ReleaseFieldCreationLockAsync(string userId, CancellationToken cancellationToken = default);
}
