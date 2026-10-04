using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IOilCellarRepository : IRepository<OilCellar, string>
{
    Task<OilCellar?> GetByOwnerPersonIdAsync(
        string ownerPersonId,
        CancellationToken cancellationToken = default);
}

public interface IOilLotRepository : IRepository<OilLot, string>
{
    /// <summary>
    /// Lots held by one cellar. <paramref name="legacyOwnerUserId"/> also picks up pre-cellar
    /// documents so they can be backfilled on their next save.
    /// </summary>
    Task<IReadOnlyList<OilLot>> GetByCellarIdAsync(
        string cellarId,
        string? legacyOwnerUserId = null,
        int? resultYear = null,
        CancellationToken cancellationToken = default);

    /// <summary>Batch lookup scoped by cellar; batch ids are unique per cellar, not per person.</summary>
    Task<OilLot?> GetByCellarAndBatchIdAsync(
        string cellarId,
        string batchId,
        string? legacyOwnerUserId = null,
        CancellationToken cancellationToken = default);
}

public interface IOilPressingRepository : IRepository<OilPressing, string>
{
    Task<OilPressing?> GetByBatchIdAsync(
        string recordedByUserId,
        string batchId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OilPressing>> GetByRecorderAsync(
        string recordedByUserId,
        int? resultYear = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Pressings still waiting for a cellar split, either recorded by this person or pressed
    /// from one of the groves they administer.
    /// </summary>
    Task<IReadOnlyList<OilPressing>> GetPendingAllocationAsync(
        string? recordedByUserId,
        IReadOnlyList<string> fieldIds,
        CancellationToken cancellationToken = default);
}

public interface IOilCommitmentRepository : IRepository<OilCommitment, string>
{
    Task<IReadOnlyList<OilCommitment>> GetByCellarIdAsync(
        string cellarId,
        string? legacyOwnerUserId = null,
        CancellationToken cancellationToken = default);
}

public interface IStockMovementRepository : IRepository<StockMovement, string>
{
    Task<IReadOnlyList<StockMovement>> GetByCellarIdAsync(
        string cellarId,
        string? legacyOwnerUserId = null,
        int limit = 100,
        CancellationToken cancellationToken = default);

    /// <summary>Both legs of one transfer, so a share can be undone on both sides.</summary>
    Task<IReadOnlyList<StockMovement>> GetByTransferIdAsync(
        string transferId,
        CancellationToken cancellationToken = default);

    /// <summary>The movement that already undid <paramref name="movementId"/>, if any.</summary>
    Task<StockMovement?> GetReversalOfAsync(
        string movementId,
        CancellationToken cancellationToken = default);
}

public interface IOilShareRequestRepository : IRepository<OilShareRequest, string>
{
    Task<IReadOnlyList<OilShareRequest>> GetByFromOwnerAsync(
        string fromOwnerUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OilShareRequest>> GetByToUserAsync(
        string toUserId,
        CancellationToken cancellationToken = default);
}
