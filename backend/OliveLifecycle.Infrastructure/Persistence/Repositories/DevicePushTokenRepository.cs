using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class DevicePushTokenRepository
    : MongoRepositoryBase<DevicePushTokenDocument, DevicePushToken>, IDevicePushTokenRepository
{
    public DevicePushTokenRepository(MongoDbContext context) : base(context, "device_push_tokens")
    {
    }

    protected override DevicePushTokenDocument ToDocument(DevicePushToken entity) =>
        DevicePushTokenMapper.ToDocument(entity);

    protected override DevicePushToken ToEntity(DevicePushTokenDocument document) =>
        DevicePushTokenMapper.ToEntity(document);

    protected override FilterDefinition<DevicePushTokenDocument> BuildIdFilter(string id) =>
        Builders<DevicePushTokenDocument>.Filter.Eq(t => t.Id, id);

    public async Task<IReadOnlyList<DevicePushToken>> GetByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(t => t.UserId == userId)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<DevicePushToken?> GetByTokenAsync(
        string expoPushToken,
        CancellationToken cancellationToken = default)
    {
        var document = await Collection
            .Find(t => t.ExpoPushToken == expoPushToken)
            .FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }

    public async Task UpsertAsync(DevicePushToken token, CancellationToken cancellationToken = default)
    {
        var existing = await GetByTokenAsync(token.ExpoPushToken, cancellationToken);
        if (existing != null)
        {
            existing.UserId = token.UserId;
            existing.Platform = token.Platform;
            existing.UpdatedAt = DateTime.UtcNow;
            await UpdateAsync(existing, cancellationToken);
            return;
        }

        token.CreatedAt = DateTime.UtcNow;
        token.UpdatedAt = DateTime.UtcNow;
        await CreateAsync(token, cancellationToken);
    }

    public async Task<int> DeleteByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        var result = await Collection.DeleteManyAsync(t => t.UserId == userId, cancellationToken);
        return (int)result.DeletedCount;
    }

    public async Task<bool> DeleteByTokenAsync(
        string userId,
        string expoPushToken,
        CancellationToken cancellationToken = default)
    {
        var result = await Collection.DeleteOneAsync(
            t => t.UserId == userId && t.ExpoPushToken == expoPushToken,
            cancellationToken);
        return result.DeletedCount > 0;
    }
}
