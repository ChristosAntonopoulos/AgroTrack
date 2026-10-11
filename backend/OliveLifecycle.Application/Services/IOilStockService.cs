using OliveLifecycle.Application.DTOs.OilStock;

namespace OliveLifecycle.Application.Services;

public interface IOilStockService
{
    Task<OilStockSummaryDto> GetSummaryAsync(
        string userId,
        int? resultYear,
        string? fieldId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OilLotDto>> ListLotsAsync(
        string userId,
        int? resultYear,
        string? fieldId,
        CancellationToken cancellationToken = default);

    Task<OilLotDto> UpsertLotAsync(
        string userId,
        UpsertOilLotDto dto,
        CancellationToken cancellationToken = default);

    /// <summary>Eligible Admin/Family members who can receive oil into their cellar for these groves.</summary>
    Task<IReadOnlyList<OilCellarCandidateDto>> ListCellarCandidatesAsync(
        string userId,
        IReadOnlyList<string> fieldIds,
        CancellationToken cancellationToken = default);

    Task<OilLotDto> PatchPackingAsync(
        string userId,
        string lotId,
        PatchOilLotPackingDto dto,
        CancellationToken cancellationToken = default);

    Task<OilLotDto> RepackAsync(
        string userId,
        string lotId,
        RepackOilLotDto dto,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OilPressingDto>> ListPressingsAsync(
        string userId,
        int? resultYear,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Pressings this person still has to split into cellars — their own parked tickets plus the
    /// ones a partner recorded on a grove they administer.
    /// </summary>
    Task<IReadOnlyList<OilPressingDto>> ListPendingAllocationsAsync(
        string userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Record one mill ticket. With allocations the oil lands in each named cellar straight away;
    /// without them it files into the grove admin cellar (admin-first).
    /// </summary>
    Task<OilPressingDto> CreatePressingAsync(
        string userId,
        CreateOilPressingDto dto,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Save harvest records and the oil they produced as one unit. If the oil step fails after
    /// harvest rows were created, those rows are voided again and the error is rethrown.
    /// </summary>
    Task<ConfirmHarvestOilResultDto> ConfirmHarvestOilAsync(
        string userId,
        string userRole,
        ConfirmHarvestOilDto dto,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// QA-027 repair: finds posted harvest oil batches (in groves this person administers) that
    /// have neither a pressing nor a cellar lot, and files them. Idempotent by batch id.
    /// </summary>
    Task<ReconcileHarvestOilResultDto> ReconcileOrphanHarvestOilAsync(
        string userId,
        CancellationToken cancellationToken = default);

    /// <summary>Split a pending pressing into cellars, creating one lot per slice.</summary>
    Task<OilPressingDto> AllocatePressingAsync(
        string userId,
        string pressingId,
        AllocateOilPressingDto dto,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OilCommitmentDto>> ListCommitmentsAsync(
        string userId,
        bool openOnly,
        CancellationToken cancellationToken = default);

    Task<OilCommitmentDto> CreateCommitmentAsync(
        string userId,
        string userRole,
        CreateOilCommitmentDto dto,
        CancellationToken cancellationToken = default);

    Task<OilCommitmentDto> DeliverAsync(
        string userId,
        string commitmentId,
        DeliverOilCommitmentDto dto,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancel a commitment. A sale goes through <see cref="CancelSaleAsync"/> so the money and the
    /// stock are reversed together; a plain promise only releases its reservation.
    /// </summary>
    Task CancelCommitmentAsync(
        string userId,
        string userRole,
        string commitmentId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancel a sale as one unit: void the linked income, put delivered oil back, mark the
    /// commitment cancelled and write the reversal movement. Fails untouched if already cancelled.
    /// </summary>
    Task<OilCommitmentDto> CancelSaleAsync(
        string userId,
        string userRole,
        string commitmentId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Receive the money for a credit sale: posts the income exactly once and marks it paid.
    /// Calling it again for a paid sale returns the commitment without posting.
    /// </summary>
    Task<OilCommitmentDto> CollectPaymentAsync(
        string userId,
        string userRole,
        string commitmentId,
        CollectOilPaymentDto? dto,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StockMovementDto>> ListMovementsAsync(
        string userId,
        int limit,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Undo one stock movement by writing its mirror image. Undoing a sale takes the same path as
    /// <see cref="CancelSaleAsync"/>: the oil moves back and the linked income is voided.
    /// </summary>
    Task<StockMovementDto> ReverseMovementAsync(
        string userId,
        string userRole,
        string movementId,
        CancellationToken cancellationToken = default);

    Task AdjustStockAsync(
        string userId,
        AdjustStockDto dto,
        CancellationToken cancellationToken = default);

    /// <summary>Admin cellar free pack Family can request from for these groves.</summary>
    Task<OilShareSourceDto?> GetShareSourceAsync(
        string userId,
        IReadOnlyList<string> fieldIds,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OilShareRequestDto>> ListShareRequestsAsync(
        string userId,
        bool pendingOnly,
        CancellationToken cancellationToken = default);

    Task<OilShareRequestDto> CreateShareRequestAsync(
        string userId,
        CreateOilShareRequestDto dto,
        CancellationToken cancellationToken = default);

    Task<OilShareRequestDto> AcceptShareRequestAsync(
        string userId,
        string requestId,
        CancellationToken cancellationToken = default);

    /// <summary>Admin pushes a pack from their cellar into another eligible platform user's cellar.</summary>
    Task<OilTransferDto> TransferToUserAsync(
        string userId,
        TransferOilDto dto,
        CancellationToken cancellationToken = default);

    Task<OilShareRequestDto> RejectShareRequestAsync(
        string userId,
        string requestId,
        CancellationToken cancellationToken = default);
}
