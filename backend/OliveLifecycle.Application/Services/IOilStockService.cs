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

    Task CancelCommitmentAsync(
        string userId,
        string commitmentId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StockMovementDto>> ListMovementsAsync(
        string userId,
        int limit,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Undo one stock movement by writing its mirror image. Money posted alongside a sale is left
    /// alone; only the oil moves back.
    /// </summary>
    Task<StockMovementDto> ReverseMovementAsync(
        string userId,
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
