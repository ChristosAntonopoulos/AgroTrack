using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IServiceCategoryRepository : IRepository<ServiceCategory, string>
{
    Task<IReadOnlyList<ServiceCategory>> GetAllAsync(bool activeOnly, CancellationToken cancellationToken = default);
    Task<ServiceCategory?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
}

public interface IServiceProviderProfileRepository : IRepository<ServiceProviderProfile, string>
{
    Task<ServiceProviderProfile?> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ServiceProviderProfile>> GetByUserIdsAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Mongo 2dsphere search around a field. Distance comes from $geoNear, not an in-memory scan of all providers.
    /// </summary>
    Task<IReadOnlyList<NearbyProviderMatch>> FindNearbyListedAsync(
        double latitude,
        double longitude,
        double maxDistanceKm,
        CancellationToken cancellationToken = default);
}

public sealed record NearbyProviderMatch(ServiceProviderProfile Profile, double DistanceKm);

public interface IServiceContactRequestRepository : IRepository<ServiceContactRequest, string>
{
    Task<IReadOnlyList<ServiceContactRequest>> GetByProviderUserIdAsync(string providerUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ServiceContactRequest>> GetByRequesterUserIdAsync(string requesterUserId, CancellationToken cancellationToken = default);
}

public interface IUserNotificationRepository : IRepository<UserNotification, string>
{
    Task<IReadOnlyList<UserNotification>> GetByUserIdAsync(string userId, int limit, CancellationToken cancellationToken = default);
    Task<int> CountUnreadAsync(string userId, CancellationToken cancellationToken = default);
}

public interface ISavedContactRepository : IRepository<SavedContact, string>
{
    Task<IReadOnlyList<SavedContact>> GetByOwnerUserIdAsync(string ownerUserId, CancellationToken cancellationToken = default);
}

public interface IFamilyCircleRepository : IRepository<FamilyCircle, string>
{
    Task<FamilyCircle?> GetByOwnerUserIdAsync(string ownerUserId, CancellationToken cancellationToken = default);
}

public interface IFamilyMemberRepository : IRepository<FamilyMember, string>
{
    Task<IReadOnlyList<FamilyMember>> GetByCircleIdAsync(string circleId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FamilyMember>> GetByOwnerUserIdAsync(string ownerUserId, CancellationToken cancellationToken = default);
    Task<FamilyMember?> GetActiveByLinkedUserIdAsync(string linkedUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FamilyMember>> GetActiveByLinkedUserIdAllAsync(string linkedUserId, CancellationToken cancellationToken = default);
    Task<int> CountOccupiedSeatsAsync(string ownerUserId, CancellationToken cancellationToken = default);
}

public interface IFamilyInviteRepository : IRepository<FamilyInvite, string>
{
    Task<FamilyInvite?> GetByTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FamilyInvite>> GetPendingByCircleIdAsync(string circleId, CancellationToken cancellationToken = default);
}
