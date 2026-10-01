using System.Linq.Expressions;
using MongoDB.Bson;
using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

internal static class OilStockFilters
{
    /// <summary>
    /// Documents held by one cellar. Pre-cellar documents carry no cellarId, so they are matched
    /// through the owner mirror until a save backfills them.
    /// </summary>
    public static FilterDefinition<TDocument> Cellar<TDocument>(
        Expression<Func<TDocument, string?>> cellarId,
        Expression<Func<TDocument, string>> ownerUserId,
        string cellarIdValue,
        string? legacyOwnerUserId)
    {
        var builder = Builders<TDocument>.Filter;
        var clauses = new List<FilterDefinition<TDocument>>();

        if (!string.IsNullOrWhiteSpace(cellarIdValue))
        {
            clauses.Add(builder.Eq(cellarId, cellarIdValue));
        }

        if (!string.IsNullOrWhiteSpace(legacyOwnerUserId))
        {
            // A null match also covers documents written before cellarId existed.
            clauses.Add(builder.And(
                builder.Eq(ownerUserId, legacyOwnerUserId),
                builder.Or(
                    builder.Eq(cellarId, (string?)null),
                    builder.Eq(cellarId, string.Empty))));
        }

        return clauses.Count switch
        {
            0 => builder.Eq("_id", BsonNull.Value),
            1 => clauses[0],
            _ => builder.Or(clauses)
        };
    }
}

public class OilCellarRepository
    : MongoRepositoryBase<OilCellarDocument, OilCellar>, IOilCellarRepository
{
    public OilCellarRepository(MongoDbContext context) : base(context, "oil_cellars")
    {
    }

    protected override OilCellarDocument ToDocument(OilCellar entity) => OilStockMapper.ToDocument(entity);
    protected override OilCellar ToEntity(OilCellarDocument document) => OilStockMapper.ToEntity(document);
    protected override FilterDefinition<OilCellarDocument> BuildIdFilter(string id) =>
        Builders<OilCellarDocument>.Filter.Eq(x => x.Id, id);

    public async Task<OilCellar?> GetByOwnerPersonIdAsync(
        string ownerPersonId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(ownerPersonId)) return null;
        var document = await Collection
            .Find(x => x.OwnerPersonId == ownerPersonId)
            .SortBy(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        return document is null ? null : ToEntity(document);
    }
}

public class OilLotRepository
    : MongoRepositoryBase<OilLotDocument, OilLot>, IOilLotRepository
{
    public OilLotRepository(MongoDbContext context) : base(context, "oil_lots")
    {
    }

    protected override OilLotDocument ToDocument(OilLot entity) => OilStockMapper.ToDocument(entity);
    protected override OilLot ToEntity(OilLotDocument document) => OilStockMapper.ToEntity(document);
    protected override FilterDefinition<OilLotDocument> BuildIdFilter(string id) =>
        Builders<OilLotDocument>.Filter.Eq(x => x.Id, id);

    public async Task<IReadOnlyList<OilLot>> GetByCellarIdAsync(
        string cellarId,
        string? legacyOwnerUserId = null,
        int? resultYear = null,
        CancellationToken cancellationToken = default)
    {
        var filter = OilStockFilters.Cellar<OilLotDocument>(
            x => x.CellarId,
            x => x.OwnerUserId,
            cellarId,
            legacyOwnerUserId);
        if (resultYear.HasValue)
        {
            filter &= Builders<OilLotDocument>.Filter.Eq(x => x.ResultYear, resultYear.Value);
        }

        var documents = await Collection
            .Find(filter)
            .SortBy(x => x.PressedOn)
            .ThenBy(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<OilLot?> GetByCellarAndBatchIdAsync(
        string cellarId,
        string batchId,
        string? legacyOwnerUserId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(batchId)) return null;
        var filter = OilStockFilters.Cellar<OilLotDocument>(
            x => x.CellarId,
            x => x.OwnerUserId,
            cellarId,
            legacyOwnerUserId);
        filter &= Builders<OilLotDocument>.Filter.Eq(x => x.BatchId, batchId);
        var document = await Collection.Find(filter).FirstOrDefaultAsync(cancellationToken);
        return document is null ? null : ToEntity(document);
    }
}

public class OilPressingRepository
    : MongoRepositoryBase<OilPressingDocument, OilPressing>, IOilPressingRepository
{
    public OilPressingRepository(MongoDbContext context) : base(context, "oil_pressings")
    {
    }

    protected override OilPressingDocument ToDocument(OilPressing entity) => OilStockMapper.ToDocument(entity);
    protected override OilPressing ToEntity(OilPressingDocument document) => OilStockMapper.ToEntity(document);
    protected override FilterDefinition<OilPressingDocument> BuildIdFilter(string id) =>
        Builders<OilPressingDocument>.Filter.Eq(x => x.Id, id);

    public async Task<OilPressing?> GetByBatchIdAsync(
        string recordedByUserId,
        string batchId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(batchId)) return null;
        var document = await Collection
            .Find(x => x.RecordedByUserId == recordedByUserId && x.BatchId == batchId)
            .FirstOrDefaultAsync(cancellationToken);
        return document is null ? null : ToEntity(document);
    }

    public async Task<IReadOnlyList<OilPressing>> GetByRecorderAsync(
        string recordedByUserId,
        int? resultYear = null,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<OilPressingDocument>.Filter.Eq(x => x.RecordedByUserId, recordedByUserId);
        if (resultYear.HasValue)
        {
            filter &= Builders<OilPressingDocument>.Filter.Eq(x => x.ResultYear, resultYear.Value);
        }

        var documents = await Collection
            .Find(filter)
            .SortByDescending(x => x.PressedOn)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<OilPressing>> GetPendingAllocationAsync(
        string? recordedByUserId,
        IReadOnlyList<string> fieldIds,
        CancellationToken cancellationToken = default)
    {
        var builder = Builders<OilPressingDocument>.Filter;
        var reach = new List<FilterDefinition<OilPressingDocument>>();
        if (!string.IsNullOrWhiteSpace(recordedByUserId))
        {
            reach.Add(builder.Eq(x => x.RecordedByUserId, recordedByUserId));
        }

        if (fieldIds.Count > 0)
        {
            reach.Add(builder.AnyIn(x => x.FieldIds, fieldIds));
        }

        if (reach.Count == 0) return [];

        var filter = builder.Eq(x => x.Status, OilPressingStatuses.PendingAllocation)
            & builder.Or(reach);
        var documents = await Collection
            .Find(filter)
            .SortByDescending(x => x.PressedOn)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}

public class OilCommitmentRepository
    : MongoRepositoryBase<OilCommitmentDocument, OilCommitment>, IOilCommitmentRepository
{
    public OilCommitmentRepository(MongoDbContext context) : base(context, "oil_commitments")
    {
    }

    protected override OilCommitmentDocument ToDocument(OilCommitment entity) =>
        OilStockMapper.ToDocument(entity);

    protected override OilCommitment ToEntity(OilCommitmentDocument document) =>
        OilStockMapper.ToEntity(document);

    protected override FilterDefinition<OilCommitmentDocument> BuildIdFilter(string id) =>
        Builders<OilCommitmentDocument>.Filter.Eq(x => x.Id, id);

    public async Task<IReadOnlyList<OilCommitment>> GetByCellarIdAsync(
        string cellarId,
        string? legacyOwnerUserId = null,
        CancellationToken cancellationToken = default)
    {
        var filter = OilStockFilters.Cellar<OilCommitmentDocument>(
            x => x.CellarId,
            x => x.OwnerUserId,
            cellarId,
            legacyOwnerUserId);
        var documents = await Collection
            .Find(filter)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}

public class StockMovementRepository
    : MongoRepositoryBase<StockMovementDocument, StockMovement>, IStockMovementRepository
{
    public StockMovementRepository(MongoDbContext context) : base(context, "stock_movements")
    {
    }

    protected override StockMovementDocument ToDocument(StockMovement entity) =>
        OilStockMapper.ToDocument(entity);

    protected override StockMovement ToEntity(StockMovementDocument document) =>
        OilStockMapper.ToEntity(document);

    protected override FilterDefinition<StockMovementDocument> BuildIdFilter(string id) =>
        Builders<StockMovementDocument>.Filter.Eq(x => x.Id, id);

    public async Task<IReadOnlyList<StockMovement>> GetByCellarIdAsync(
        string cellarId,
        string? legacyOwnerUserId = null,
        int limit = 100,
        CancellationToken cancellationToken = default)
    {
        var take = Math.Clamp(limit, 1, 500);
        var filter = OilStockFilters.Cellar<StockMovementDocument>(
            x => x.CellarId,
            x => x.OwnerUserId,
            cellarId,
            legacyOwnerUserId);
        var documents = await Collection
            .Find(filter)
            .SortByDescending(x => x.OccurredOn)
            .ThenByDescending(x => x.CreatedAt)
            .Limit(take)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<StockMovement>> GetByTransferIdAsync(
        string transferId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(transferId)) return [];
        var documents = await Collection
            .Find(x => x.TransferId == transferId)
            .SortBy(x => x.OccurredOn)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<StockMovement?> GetReversalOfAsync(
        string movementId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(movementId)) return null;
        var document = await Collection
            .Find(x => x.ReversalOfMovementId == movementId)
            .FirstOrDefaultAsync(cancellationToken);
        return document is null ? null : ToEntity(document);
    }
}

public class OilShareRequestRepository
    : MongoRepositoryBase<OilShareRequestDocument, OilShareRequest>, IOilShareRequestRepository
{
    public OilShareRequestRepository(MongoDbContext context) : base(context, "oil_share_requests")
    {
    }

    protected override OilShareRequestDocument ToDocument(OilShareRequest entity) =>
        OilStockMapper.ToDocument(entity);

    protected override OilShareRequest ToEntity(OilShareRequestDocument document) =>
        OilStockMapper.ToEntity(document);

    protected override FilterDefinition<OilShareRequestDocument> BuildIdFilter(string id) =>
        Builders<OilShareRequestDocument>.Filter.Eq(x => x.Id, id);

    public async Task<IReadOnlyList<OilShareRequest>> GetByFromOwnerAsync(
        string fromOwnerUserId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(x => x.FromOwnerUserId == fromOwnerUserId)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<OilShareRequest>> GetByToUserAsync(
        string toUserId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(x => x.ToUserId == toUserId)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}
