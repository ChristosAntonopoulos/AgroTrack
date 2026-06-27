using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.DTOs.Ministry;

namespace OliveLifecycle.Application.Services;

public interface IMinistryNotificationService
{
    Task<IEnumerable<MinistryNotificationDto>> GetNotificationsAsync(string userRole, string userId, bool urgentOnly = false, CancellationToken cancellationToken = default);
    Task MarkAsReadAsync(string userId, string notificationId, CancellationToken cancellationToken = default);
    Task MarkAllAsReadAsync(string userRole, string userId, CancellationToken cancellationToken = default);
}

public class MinistryNotificationService : IMinistryNotificationService
{
    private readonly IMinistryNotificationRepository _repository;

    public MinistryNotificationService(IMinistryNotificationRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<MinistryNotificationDto>> GetNotificationsAsync(
        string userRole,
        string userId,
        bool urgentOnly = false,
        CancellationToken cancellationToken = default)
    {
        var notifications = await _repository.GetActiveForRoleAsync(userRole, cancellationToken);
        var readIds = (await _repository.GetReadNotificationIdsAsync(userId, cancellationToken)).ToHashSet();

        var query = notifications.AsEnumerable();
        if (urgentOnly)
        {
            query = query.Where(n => n.Priority is "critical" or "high");
        }

        return query.Select(n => new MinistryNotificationDto
        {
            Id = n.Id,
            Title = n.Title,
            Message = n.Message,
            Type = n.Type,
            Priority = n.Priority,
            Date = n.PublishedAt,
            ExpirationDate = n.ExpirationDate,
            Read = readIds.Contains(n.Id),
            ActionUrl = n.ActionUrl,
            Category = n.Category,
            TargetRoles = n.TargetRoles
        });
    }

    public Task MarkAsReadAsync(string userId, string notificationId, CancellationToken cancellationToken = default) =>
        _repository.MarkReadAsync(userId, notificationId, cancellationToken);

    public async Task MarkAllAsReadAsync(string userRole, string userId, CancellationToken cancellationToken = default)
    {
        var notifications = await _repository.GetActiveForRoleAsync(userRole, cancellationToken);
        await _repository.MarkAllReadAsync(userId, notifications.Select(n => n.Id), cancellationToken);
    }
}
