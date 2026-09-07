using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class FinancialEntryRepository : MongoRepositoryBase<FinancialEntryDocument, FinancialEntry>, IFinancialEntryRepository
{
    public FinancialEntryRepository(MongoDbContext context) : base(context, "financial_entries")
    {
    }

    protected override FinancialEntryDocument ToDocument(FinancialEntry entity) => FinancialEntryMapper.ToDocument(entity);
    protected override FinancialEntry ToEntity(FinancialEntryDocument document) => FinancialEntryMapper.ToEntity(document);
    protected override FilterDefinition<FinancialEntryDocument> BuildIdFilter(string id) =>
        Builders<FinancialEntryDocument>.Filter.Eq(e => e.Id, id);

    public async Task<IEnumerable<FinancialEntry>> GetByFieldIdAsync(
        string fieldId,
        bool includeVoided = false,
        int limit = 200,
        CancellationToken cancellationToken = default)
    {
        var filter = includeVoided
            ? Builders<FinancialEntryDocument>.Filter.Eq(e => e.FieldId, fieldId)
            : Builders<FinancialEntryDocument>.Filter.And(
                Builders<FinancialEntryDocument>.Filter.Eq(e => e.FieldId, fieldId),
                Builders<FinancialEntryDocument>.Filter.Ne(e => e.Status, "voided"));

        var documents = await Collection
            .Find(filter)
            .SortByDescending(e => e.OccurredOn)
            .Limit(limit)
            .ToListAsync(cancellationToken);

        return documents.Select(ToEntity);
    }

    public async Task<IEnumerable<FinancialEntry>> GetByFieldIdsAsync(
        IEnumerable<string> fieldIds,
        CancellationToken cancellationToken = default)
    {
        var ids = fieldIds.ToList();
        if (ids.Count == 0)
        {
            return Enumerable.Empty<FinancialEntry>();
        }

        var filter = Builders<FinancialEntryDocument>.Filter.And(
            Builders<FinancialEntryDocument>.Filter.In(e => e.FieldId, ids),
            Builders<FinancialEntryDocument>.Filter.Ne(e => e.Status, "voided"));

        var documents = await Collection.Find(filter).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }
}
