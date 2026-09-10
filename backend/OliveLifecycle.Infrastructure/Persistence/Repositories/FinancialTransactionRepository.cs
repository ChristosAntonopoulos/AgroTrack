using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Time;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class FinancialTransactionRepository
    : MongoRepositoryBase<FinancialTransactionDocument, FinancialTransaction>, IFinancialTransactionRepository
{
    public FinancialTransactionRepository(MongoDbContext context) : base(context, "financial_transactions")
    {
    }

    protected override FinancialTransactionDocument ToDocument(FinancialTransaction entity) =>
        FinancialTransactionMapper.ToDocument(entity);

    protected override FinancialTransaction ToEntity(FinancialTransactionDocument document) =>
        FinancialTransactionMapper.ToEntity(document);

    protected override FilterDefinition<FinancialTransactionDocument> BuildIdFilter(string id) =>
        Builders<FinancialTransactionDocument>.Filter.Eq(e => e.Id, id);

    public async Task<FinancialTransaction?> GetByIdempotencyKeyAsync(
        string ownerUserId,
        string idempotencyKey,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            return null;
        }

        var filter = Builders<FinancialTransactionDocument>.Filter.And(
            Builders<FinancialTransactionDocument>.Filter.Eq(e => e.OwnerUserId, ownerUserId),
            Builders<FinancialTransactionDocument>.Filter.Eq(e => e.IdempotencyKey, idempotencyKey));
        var document = await Collection.Find(filter).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }

    public async Task<FinancialTransactionPage> QueryAsync(
        FinancialTransactionQuery query,
        CancellationToken cancellationToken = default)
    {
        var filter = BuildQueryFilter(query);
        var total = (int)await Collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize is < 1 or > 200 ? 50 : query.PageSize;
        var documents = await Collection
            .Find(filter)
            .SortByDescending(e => e.OccurredOn)
            .ThenByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync(cancellationToken);

        var items = documents.Select(ToEntity).ToList();
        if (query.Month is >= 1 and <= 12)
        {
            items = items.Where(t => AthensTime.ToAthens(t.OccurredOn).Month == query.Month).ToList();
        }

        return new FinancialTransactionPage
        {
            Items = items,
            TotalCount = query.Month is >= 1 and <= 12 ? items.Count : total
        };
    }

    public async Task<IReadOnlyList<FinancialTransaction>> GetForYearAsync(
        string ownerUserId,
        int resultYear,
        IReadOnlyList<string> permittedFieldIds,
        string? fieldId,
        bool includeUnassigned,
        CancellationToken cancellationToken = default)
    {
        var yearFilter = Builders<FinancialTransactionDocument>.Filter.And(
            Builders<FinancialTransactionDocument>.Filter.Eq(e => e.OwnerUserId, ownerUserId),
            Builders<FinancialTransactionDocument>.Filter.Eq(e => e.ResultYear, resultYear));

        FilterDefinition<FinancialTransactionDocument> scope;
        if (!string.IsNullOrWhiteSpace(fieldId))
        {
            scope = Builders<FinancialTransactionDocument>.Filter.Eq(e => e.FieldId, fieldId);
        }
        else
        {
            var parts = new List<FilterDefinition<FinancialTransactionDocument>>();
            if (permittedFieldIds.Count > 0)
            {
                parts.Add(Builders<FinancialTransactionDocument>.Filter.In(e => e.FieldId, permittedFieldIds));
            }

            if (includeUnassigned)
            {
                parts.Add(Builders<FinancialTransactionDocument>.Filter.Or(
                    Builders<FinancialTransactionDocument>.Filter.Eq(e => e.FieldId, null),
                    Builders<FinancialTransactionDocument>.Filter.Eq(e => e.FieldId, string.Empty)));
            }

            if (parts.Count == 0)
            {
                return [];
            }

            scope = Builders<FinancialTransactionDocument>.Filter.Or(parts);
        }

        var documents = await Collection
            .Find(Builders<FinancialTransactionDocument>.Filter.And(yearFilter, scope))
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<FinancialTransaction>> GetByRelatedTaskIdAsync(
        string taskId,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<FinancialTransactionDocument>.Filter.Eq(e => e.RelatedTaskId, taskId);
        var documents = await Collection.Find(filter).ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<FinancialTransaction>> GetByRelatedHarvestIdAsync(
        string harvestId,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<FinancialTransactionDocument>.Filter.Eq(e => e.RelatedHarvestId, harvestId);
        var documents = await Collection.Find(filter).ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    private static FilterDefinition<FinancialTransactionDocument> BuildQueryFilter(FinancialTransactionQuery query)
    {
        var filters = new List<FilterDefinition<FinancialTransactionDocument>>();
        var builder = Builders<FinancialTransactionDocument>.Filter;

        if (!string.IsNullOrWhiteSpace(query.OwnerUserId))
        {
            filters.Add(builder.Eq(e => e.OwnerUserId, query.OwnerUserId));
        }

        if (query.ResultYear.HasValue)
        {
            filters.Add(builder.Eq(e => e.ResultYear, query.ResultYear.Value));
        }

        if (!string.IsNullOrWhiteSpace(query.FieldId))
        {
            filters.Add(builder.Eq(e => e.FieldId, query.FieldId));
        }
        else if (query.FieldIds is { Count: > 0 } || query.IncludeUnassigned)
        {
            var scope = new List<FilterDefinition<FinancialTransactionDocument>>();
            if (query.FieldIds is { Count: > 0 })
            {
                scope.Add(builder.In(e => e.FieldId, query.FieldIds));
            }

            if (query.IncludeUnassigned)
            {
                scope.Add(builder.Or(
                    builder.Eq(e => e.FieldId, null),
                    builder.Eq(e => e.FieldId, string.Empty)));
            }

            if (scope.Count > 0)
            {
                filters.Add(builder.Or(scope));
            }
        }

        if (query.Type.HasValue)
        {
            filters.Add(builder.Eq(e => e.Type, query.Type.Value.ToApiString()));
        }

        if (query.Status.HasValue)
        {
            filters.Add(builder.Eq(e => e.Status, query.Status.Value.ToApiString()));
        }

        if (query.Category.HasValue)
        {
            filters.Add(builder.Eq(e => e.Category, query.Category.Value.ToApiString()));
        }

        if (!string.IsNullOrWhiteSpace(query.RelatedTaskId))
        {
            filters.Add(builder.Eq(e => e.RelatedTaskId, query.RelatedTaskId));
        }

        if (!string.IsNullOrWhiteSpace(query.RelatedHarvestId))
        {
            filters.Add(builder.Eq(e => e.RelatedHarvestId, query.RelatedHarvestId));
        }

        if (!string.IsNullOrWhiteSpace(query.CreatedByUserId))
        {
            filters.Add(builder.Eq(e => e.CreatedByUserId, query.CreatedByUserId));
        }

        return filters.Count == 0 ? builder.Empty : builder.And(filters);
    }

    public async Task<IReadOnlyList<FinancialTransaction>> GetPostedByFieldIdsAsync(
        IReadOnlyList<string> fieldIds,
        CancellationToken cancellationToken = default)
    {
        if (fieldIds.Count == 0)
        {
            return [];
        }

        var builder = Builders<FinancialTransactionDocument>.Filter;
        var filter = builder.And(
            builder.In(e => e.FieldId, fieldIds),
            builder.Eq(e => e.Status, FinancialTransactionStatus.Posted.ToApiString()));
        var documents = await Collection.Find(filter).ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}
