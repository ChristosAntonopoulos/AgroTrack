using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class HarvestRecordRepository : MongoRepositoryBase<HarvestRecordDocument, HarvestRecord>, IHarvestRecordRepository
{
    public HarvestRecordRepository(MongoDbContext context) : base(context, "harvest_records")
    {
    }

    protected override HarvestRecordDocument ToDocument(HarvestRecord entity) => HarvestRecordMapper.ToDocument(entity);
    protected override HarvestRecord ToEntity(HarvestRecordDocument document) => HarvestRecordMapper.ToEntity(document);
    protected override FilterDefinition<HarvestRecordDocument> BuildIdFilter(string id) =>
        Builders<HarvestRecordDocument>.Filter.Eq(h => h.Id, id);

    public async Task<IEnumerable<HarvestRecord>> GetByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(h => h.FieldId == fieldId)
            .SortByDescending(h => h.HarvestDate)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    public async Task<IEnumerable<HarvestRecord>> GetByOwnerIdAsync(string ownerId, CancellationToken cancellationToken = default)
    {
        var documents = await Collection.Find(h => h.OwnerId == ownerId).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    public async Task<IEnumerable<HarvestRecord>> GetByFieldIdsAsync(IEnumerable<string> fieldIds, CancellationToken cancellationToken = default)
    {
        var ids = fieldIds.ToList();
        if (ids.Count == 0)
        {
            return Enumerable.Empty<HarvestRecord>();
        }

        var filter = Builders<HarvestRecordDocument>.Filter.In(h => h.FieldId, ids);
        var documents = await Collection.Find(filter).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }
}
