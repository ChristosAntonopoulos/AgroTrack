using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

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

    public async Task<IReadOnlyList<OilLot>> GetByOwnerAsync(
        string ownerUserId,
        int? resultYear = null,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<OilLotDocument>.Filter.Eq(x => x.OwnerUserId, ownerUserId);
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

    public async Task<OilLot?> GetByOwnerAndBatchIdAsync(
        string ownerUserId,
        string batchId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(batchId)) return null;
        var document = await Collection
            .Find(x => x.OwnerUserId == ownerUserId && x.BatchId == batchId)
            .FirstOrDefaultAsync(cancellationToken);
        return document is null ? null : ToEntity(document);
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

    public async Task<IReadOnlyList<OilCommitment>> GetByOwnerAsync(
        string ownerUserId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(x => x.OwnerUserId == ownerUserId)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<OilCommitment>> GetOpenByOwnerAsync(
        string ownerUserId,
        CancellationToken cancellationToken = default)
    {
        var all = await GetByOwnerAsync(ownerUserId, cancellationToken);
        return all
            .Where(c => !c.Cancelled && !OilPackMathFullyDelivered(c))
            .ToList();
    }

    private static bool OilPackMathFullyDelivered(OilCommitment c) =>
        Core.OilStock.OilPackMath.IsFullyCovered(c.Requested, c.Delivered);
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

    public async Task<IReadOnlyList<StockMovement>> GetByOwnerAsync(
        string ownerUserId,
        int limit = 100,
        CancellationToken cancellationToken = default)
    {
        var take = Math.Clamp(limit, 1, 500);
        var documents = await Collection
            .Find(x => x.OwnerUserId == ownerUserId)
            .SortByDescending(x => x.OccurredOn)
            .ThenByDescending(x => x.CreatedAt)
            .Limit(take)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}
