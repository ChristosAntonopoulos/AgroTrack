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

    Task AdjustStockAsync(
        string userId,
        AdjustStockDto dto,
        CancellationToken cancellationToken = default);
}
