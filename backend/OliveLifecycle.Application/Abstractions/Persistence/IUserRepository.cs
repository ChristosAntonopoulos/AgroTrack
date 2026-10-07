using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IUserRepository : IRepository<User, string>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> GetByPasswordResetTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);
    Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<IEnumerable<User>> GetByRoleAsync(string role, CancellationToken cancellationToken = default);
    Task<IEnumerable<User>> GetByIdsAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default);

    Task<int> CountActiveAsync(CancellationToken cancellationToken = default);

    Task<int> CountCreatedSinceAsync(DateTime sinceUtc, CancellationToken cancellationToken = default);

    Task<int> CountSeenSinceAsync(DateTime sinceUtc, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<User> Items, int Total)> SearchPageAsync(
        string? search,
        string? role,
        int page,
        int pageSize,
        string sortBy,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<User>> GetNewestAsync(int limit, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sets <see cref="User.LastSeenAt"/> when missing or older than <paramref name="minAge"/>.
    /// </summary>
    Task<bool> TouchLastSeenAsync(
        string userId,
        DateTime nowUtc,
        TimeSpan minAge,
        CancellationToken cancellationToken = default);
}
