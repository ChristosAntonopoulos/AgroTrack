using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.DTOs.Partners;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class UserNotificationService : IUserNotificationService
{
    private readonly IUserNotificationRepository _repository;

    public UserNotificationService(IUserNotificationRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<UserNotificationDto>> GetMineAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var items = await _repository.GetByUserIdAsync(userId, 50, cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task MarkReadAsync(string notificationId, string userId, CancellationToken cancellationToken = default)
    {
        var item = await _repository.GetByIdAsync(notificationId, cancellationToken)
            ?? throw new NotFoundException("Notification not found.");
        if (item.UserId != userId)
        {
            throw new ForbiddenException("You cannot update this notification.");
        }

        if (item.IsRead)
        {
            return;
        }

        item.IsRead = true;
        await _repository.UpdateAsync(item, cancellationToken);
    }

    public Task NotifyAsync(UserNotification notification, CancellationToken cancellationToken = default) =>
        _repository.CreateAsync(notification, cancellationToken);

    private static UserNotificationDto ToDto(UserNotification item) => new()
    {
        Id = item.Id,
        Type = item.Type,
        Title = item.Title,
        Message = item.Message,
        RelatedEntityId = item.RelatedEntityId,
        RelatedEntityType = item.RelatedEntityType,
        ActionUrl = item.ActionUrl,
        IsRead = item.IsRead,
        CreatedAt = item.CreatedAt
    };
}
