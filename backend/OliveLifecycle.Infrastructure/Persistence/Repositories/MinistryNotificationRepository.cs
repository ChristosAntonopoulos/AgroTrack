using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class MinistryNotificationRepository : IMinistryNotificationRepository
{
    private readonly IMongoCollection<MinistryNotificationDocument> _notifications;
    private readonly IMongoCollection<MinistryNotificationReadDocument> _reads;

    public MinistryNotificationRepository(MongoDbContext context)
    {
        _notifications = context.GetCollection<MinistryNotificationDocument>("ministry_notifications");
        _reads = context.GetCollection<MinistryNotificationReadDocument>("ministry_notification_reads");
    }

    public async Task<IEnumerable<MinistryNotification>> GetActiveForRoleAsync(string role, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var filter = Builders<MinistryNotificationDocument>.Filter.And(
            Builders<MinistryNotificationDocument>.Filter.AnyEq(n => n.TargetRoles, role),
            Builders<MinistryNotificationDocument>.Filter.Or(
                Builders<MinistryNotificationDocument>.Filter.Eq(n => n.ExpirationDate, null),
                Builders<MinistryNotificationDocument>.Filter.Gte(n => n.ExpirationDate, now)));

        var documents = await _notifications.Find(filter).SortByDescending(n => n.PublishedAt).ToListAsync(cancellationToken);
        return documents.Select(MinistryNotificationMapper.ToEntity);
    }

    public async Task<MinistryNotification?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var document = await _notifications.Find(n => n.Id == id).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : MinistryNotificationMapper.ToEntity(document);
    }

    public async Task MarkReadAsync(string userId, string notificationId, CancellationToken cancellationToken = default)
    {
        var exists = await _reads.Find(r => r.UserId == userId && r.NotificationId == notificationId).AnyAsync(cancellationToken);
        if (exists)
        {
            return;
        }

        var now = DateTime.UtcNow;
        await _reads.InsertOneAsync(new MinistryNotificationReadDocument
        {
            UserId = userId,
            NotificationId = notificationId,
            CreatedAt = now,
            UpdatedAt = now
        }, cancellationToken: cancellationToken);
    }

    public async Task MarkAllReadAsync(string userId, IEnumerable<string> notificationIds, CancellationToken cancellationToken = default)
    {
        foreach (var notificationId in notificationIds)
        {
            await MarkReadAsync(userId, notificationId, cancellationToken);
        }
    }

    public async Task<IEnumerable<string>> GetReadNotificationIdsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var reads = await _reads.Find(r => r.UserId == userId).ToListAsync(cancellationToken);
        return reads.Select(r => r.NotificationId);
    }
}
