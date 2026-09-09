using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class UserNotificationRepository
    : MongoRepositoryBase<UserNotificationDocument, UserNotification>, IUserNotificationRepository
{
    public UserNotificationRepository(MongoDbContext context) : base(context, "user_notifications")
    {
    }

    protected override UserNotificationDocument ToDocument(UserNotification entity) =>
        UserNotificationMapper.ToDocument(entity);

    protected override UserNotification ToEntity(UserNotificationDocument document) =>
        UserNotificationMapper.ToEntity(document);

    protected override FilterDefinition<UserNotificationDocument> BuildIdFilter(string id) =>
        Builders<UserNotificationDocument>.Filter.Eq(n => n.Id, id);

    public async Task<IReadOnlyList<UserNotification>> GetByUserIdAsync(
        string userId,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(n => n.UserId == userId)
            .SortByDescending(n => n.CreatedAt)
            .Limit(Math.Clamp(limit, 1, 100))
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<int> CountUnreadAsync(string userId, CancellationToken cancellationToken = default)
    {
        return (int)await Collection.CountDocumentsAsync(
            n => n.UserId == userId && !n.IsRead,
            cancellationToken: cancellationToken);
    }
}
