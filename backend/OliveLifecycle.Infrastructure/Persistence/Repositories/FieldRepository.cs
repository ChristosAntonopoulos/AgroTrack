using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class FieldRepository : MongoRepositoryBase<FieldDocument, Field>, IFieldRepository
{
    public FieldRepository(MongoDbContext context) : base(context, "fields")
    {
    }

    protected override FieldDocument ToDocument(Field entity) => FieldMapper.ToDocument(entity);
    protected override Field ToEntity(FieldDocument document) => FieldMapper.ToEntity(document);
    protected override FilterDefinition<FieldDocument> BuildIdFilter(string id) =>
        Builders<FieldDocument>.Filter.Eq(f => f.Id, id);

    public async Task<IEnumerable<Field>> GetByOwnerIdAsync(string ownerId, CancellationToken cancellationToken = default)
    {
        var documents = await Collection.Find(f => f.OwnerId == ownerId).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    public async Task<IEnumerable<Field>> GetByIdsAsync(IEnumerable<string> fieldIds, CancellationToken cancellationToken = default)
    {
        var filter = Builders<FieldDocument>.Filter.In(f => f.Id, fieldIds);
        var documents = await Collection.Find(filter).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    public async Task<IEnumerable<Field>> GetByAssignedProducerIdAsync(string producerId, CancellationToken cancellationToken = default)
    {
        var documents = await Collection.Find(f => f.AssignedProducerIds.Contains(producerId)).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    public async Task<IEnumerable<Field>> GetByOwnerAndNormalizedKaekAsync(
        string ownerId,
        string normalizedKaek,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<FieldDocument>.Filter.And(
            Builders<FieldDocument>.Filter.Eq(f => f.OwnerId, ownerId),
            Builders<FieldDocument>.Filter.Eq("greekCadastre.normalizedKaek", normalizedKaek));
        var documents = await Collection.Find(filter).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    public async Task<bool> ExistsAsync(string id, CancellationToken cancellationToken = default)
    {
        var count = await Collection.CountDocumentsAsync(BuildIdFilter(id), cancellationToken: cancellationToken);
        return count > 0;
    }
}
