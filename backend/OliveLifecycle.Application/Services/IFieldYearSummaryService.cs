using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Core.Finance;

namespace OliveLifecycle.Application.Services;

public interface IFieldYearSummaryService
{
    Task<FieldYearSummaryDto> GetAsync(
        string fieldId,
        int resultYear,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);
}

public class FieldYearSummaryDto
{
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public string Currency { get; set; } = "EUR";
    public decimal? TotalIncome { get; set; }
    public decimal? TotalExpenses { get; set; }
    public decimal? NetResult { get; set; }
    public string ResultLabel { get; set; } = string.Empty;
    public decimal? CostPerKilogramOfOil { get; set; }
    public string? CostPerKilogramMessage { get; set; }
    public decimal? OilKilograms { get; set; }
    public decimal? OliveKilograms { get; set; }
    public OliveOilEconomicsDto OliveOil { get; set; } = new();
    public int PostedTransactionCount { get; set; }
    public int DraftTransactionCount { get; set; }
    public int CompletedExecutionCount { get; set; }
    public int PartialExecutionCount { get; set; }
    public int ConfirmedHarvestCount { get; set; }
    public int PhenologyObservationCount { get; set; }
    public int WeatherReviewCount { get; set; }
    public int ActiveOfficialWarningCount { get; set; }
    public FinancialDataAvailabilityDto DataAvailability { get; set; } = new();
}
