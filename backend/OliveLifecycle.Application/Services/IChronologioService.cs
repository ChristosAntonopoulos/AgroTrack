using OliveLifecycle.Application.DTOs.Chronologio;

namespace OliveLifecycle.Application.Services;

public interface IChronologioService
{
    Task<IReadOnlyList<ChronologioEntryDto>> GetForFieldAsync(
        string fieldId,
        string userId,
        string userRole,
        ChronologioQuery query,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChronologioEntryDto>> GetForUserAsync(
        string userId,
        string userRole,
        ChronologioQuery query,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChronologioPeriodSummaryDto>> GetYearSummariesForFieldAsync(
        string fieldId,
        string userId,
        string userRole,
        ChronologioSummaryQuery query,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChronologioPeriodSummaryDto>> GetYearSummariesForUserAsync(
        string userId,
        string userRole,
        ChronologioSummaryQuery query,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChronologioMonthSummaryDto>> GetMonthSummariesForFieldAsync(
        string fieldId,
        string userId,
        string userRole,
        ChronologioSummaryQuery query,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChronologioMonthSummaryDto>> GetMonthSummariesForUserAsync(
        string userId,
        string userRole,
        ChronologioSummaryQuery query,
        CancellationToken cancellationToken = default);
}
