using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IOilLotRepository : IRepository<OilLot, string>
{
    Task<IReadOnlyList<OilLot>> GetByOwnerAsync(
        string ownerUserId,
        int? resultYear = null,
        CancellationToken cancellationToken = default);

    Task<OilLot?> GetByOwnerAndBatchIdAsync(
        string ownerUserId,
        string batchId,
        CancellationToken cancellationToken = default);
}

public interface IOilCommitmentRepository : IRepository<OilCommitment, string>
{
    Task<IReadOnlyList<OilCommitment>> GetByOwnerAsync(
        string ownerUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OilCommitment>> GetOpenByOwnerAsync(
        string ownerUserId,
        CancellationToken cancellationToken = default);
}

public interface IStockMovementRepository : IRepository<StockMovement, string>
{
    Task<IReadOnlyList<StockMovement>> GetByOwnerAsync(
        string ownerUserId,
        int limit = 100,
        CancellationToken cancellationToken = default);
}
