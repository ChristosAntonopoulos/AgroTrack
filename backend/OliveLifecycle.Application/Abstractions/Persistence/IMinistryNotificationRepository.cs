using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IMinistryNotificationRepository
{
    Task<IEnumerable<MinistryNotification>> GetActiveForRoleAsync(string role, CancellationToken cancellationToken = default);
    Task<MinistryNotification?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task MarkReadAsync(string userId, string notificationId, CancellationToken cancellationToken = default);
    Task MarkAllReadAsync(string userId, IEnumerable<string> notificationIds, CancellationToken cancellationToken = default);
    Task<IEnumerable<string>> GetReadNotificationIdsAsync(string userId, CancellationToken cancellationToken = default);
}
