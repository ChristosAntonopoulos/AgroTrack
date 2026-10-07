using MongoDB.Bson;
using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class BillingProfileRepository : IBillingProfileRepository
{
    private readonly IMongoCollection<BillingProfileDocument> _collection;

    public BillingProfileRepository(MongoDbContext context)
    {
        _collection = context.GetCollection<BillingProfileDocument>("billing_profiles");
    }

    public async Task<BillingProfile?> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        var document = await _collection.Find(p => p.UserId == userId).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : BillingProfileMapper.ToEntity(document);
    }

    public async Task<BillingProfile> UpsertAsync(BillingProfile profile, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(profile.Id))
        {
            profile.Id = ObjectId.GenerateNewId().ToString();
        }

        profile.UpdatedAt = DateTime.UtcNow;
        var document = BillingProfileMapper.ToDocument(profile);
        await _collection.ReplaceOneAsync(
            p => p.UserId == profile.UserId,
            document,
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);
        return BillingProfileMapper.ToEntity(document);
    }

    public async Task<bool> TryAcquireFieldCreationLockAsync(
        string userId,
        DateTime lockUntilUtc,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        await EnsureProfileShellAsync(userId, now, cancellationToken);

        var filter = Builders<BillingProfileDocument>.Filter.And(
            Builders<BillingProfileDocument>.Filter.Eq(p => p.UserId, userId),
            Builders<BillingProfileDocument>.Filter.Or(
                Builders<BillingProfileDocument>.Filter.Eq(p => p.FieldCreationLockUntil, null),
                Builders<BillingProfileDocument>.Filter.Lt(p => p.FieldCreationLockUntil, now)));

        var update = Builders<BillingProfileDocument>.Update
            .Set(p => p.FieldCreationLockUntil, lockUntilUtc)
            .Set(p => p.UpdatedAt, now);

        var result = await _collection.UpdateOneAsync(filter, update, cancellationToken: cancellationToken);
        return result.ModifiedCount > 0;
    }

    public async Task ReleaseFieldCreationLockAsync(string userId, CancellationToken cancellationToken = default)
    {
        await _collection.UpdateOneAsync(
            p => p.UserId == userId,
            Builders<BillingProfileDocument>.Update
                .Set(p => p.FieldCreationLockUntil, (DateTime?)null)
                .Set(p => p.UpdatedAt, DateTime.UtcNow),
            cancellationToken: cancellationToken);
    }

    private async Task EnsureProfileShellAsync(string userId, DateTime now, CancellationToken cancellationToken)
    {
        var existing = await _collection.Find(p => p.UserId == userId).FirstOrDefaultAsync(cancellationToken);
        if (existing != null)
        {
            return;
        }

        var shell = new BillingProfileDocument
        {
            Id = ObjectId.GenerateNewId().ToString(),
            UserId = userId,
            PlanCode = PlanCode.Free,
            Status = SubscriptionStatus.Active,
            Provider = BillingProvider.None,
            EntitlementActive = false,
            WillRenew = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        try
        {
            await _collection.InsertOneAsync(shell, cancellationToken: cancellationToken);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            // Concurrent create — fine.
        }
    }
}
