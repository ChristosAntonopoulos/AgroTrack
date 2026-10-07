using MongoDB.Bson;
using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class ProcessedBillingEventRepository : IProcessedBillingEventRepository
{
    private readonly IMongoCollection<ProcessedBillingEventDocument> _collection;

    public ProcessedBillingEventRepository(MongoDbContext context)
    {
        _collection = context.GetCollection<ProcessedBillingEventDocument>("processed_billing_events");
    }

    public async Task<bool> ExistsAsync(string providerEventId, CancellationToken cancellationToken = default)
    {
        var count = await _collection.CountDocumentsAsync(
            e => e.ProviderEventId == providerEventId,
            cancellationToken: cancellationToken);
        return count > 0;
    }

    public async Task<ProcessedBillingEvent> CreateAsync(
        ProcessedBillingEvent entity,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(entity.Id))
        {
            entity.Id = ObjectId.GenerateNewId().ToString();
        }

        var document = new ProcessedBillingEventDocument
        {
            Id = entity.Id,
            ProviderEventId = entity.ProviderEventId,
            Provider = entity.Provider,
            EventType = entity.EventType,
            AppUserId = entity.AppUserId,
            ProcessedAt = entity.ProcessedAt,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt
        };

        try
        {
            await _collection.InsertOneAsync(document, cancellationToken: cancellationToken);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            // Concurrent duplicate webhook — treat as already processed.
        }

        return entity;
    }
}
