using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Finance;

public sealed class YearFinancialSummary
{
    public int Year { get; init; }
    public string Currency { get; init; } = "EUR";
    public string? FieldId { get; init; }
    public decimal? TotalIncome { get; init; }
    public decimal? TotalExpenses { get; init; }
    public decimal? NetResult { get; init; }
    public string ResultLabel { get; init; } = string.Empty;
    public int TransactionCount { get; init; }
    public int DraftCount { get; init; }
    public DateTime? LastPostedAt { get; init; }
    public IReadOnlyList<MonthlyFinancialResult> MonthlyResults { get; init; } = [];
    public IReadOnlyList<FieldFinancialResult> FieldResults { get; init; } = [];
    public IReadOnlyList<CategoryFinancialResult> IncomeByCategory { get; init; } = [];
    public IReadOnlyList<CategoryFinancialResult> ExpenseByCategory { get; init; } = [];
    public decimal? CostPerHectare { get; init; }
    public decimal? IncomePerHectare { get; init; }
    public decimal? NetPerHectare { get; init; }
    public decimal? CostPerKilogramOfOil { get; init; }
    public OliveOilEconomics OliveOil { get; init; } = new();
    public FinancialDataAvailability DataAvailability { get; init; } = new();
}

public sealed class MonthlyFinancialResult
{
    public int Month { get; init; }
    public decimal? Income { get; init; }
    public decimal? Expenses { get; init; }
    public decimal? NetResult { get; init; }
    public bool HasRecords { get; init; }
}

public sealed class FieldFinancialResult
{
    public string? FieldId { get; init; }
    public string FieldName { get; init; } = string.Empty;
    public bool IsUnassigned { get; init; }
    public decimal? Income { get; init; }
    public decimal? Expenses { get; init; }
    public decimal? NetResult { get; init; }
    public decimal? CostPerHectare { get; init; }
    public decimal? IncomePerHectare { get; init; }
    public decimal? NetPerHectare { get; init; }
    public int TransactionCount { get; init; }
}

public sealed class CategoryFinancialResult
{
    public FinancialTransactionCategory Category { get; init; }
    public string CategoryKey { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public decimal? PercentageOfTotal { get; init; }
}

public sealed class HarvestFinancialSummary
{
    public string HarvestId { get; init; } = string.Empty;
    public string FieldId { get; init; } = string.Empty;
    public decimal? Income { get; init; }
    public decimal? Expenses { get; init; }
    public decimal? NetResult { get; init; }
    public bool HasRecordedIncome { get; init; }
    public bool HasRecordedExpenses { get; init; }
    public int TransactionCount { get; init; }
    public FinancialDataAvailability DataAvailability { get; init; } = new();
}

public sealed class TaskFinancialSummary
{
    public string TaskId { get; init; } = string.Empty;
    public string FieldId { get; init; } = string.Empty;
    public decimal? EstimatedCost { get; init; }
    public decimal? ActualCost { get; init; }
    public decimal? Difference { get; init; }
    public int TransactionCount { get; init; }
    public FinancialDataAvailability DataAvailability { get; init; } = new();
}

public sealed class FinancialDataAvailability
{
    public bool HasPostedRecords { get; init; }
    public bool HasDraftRecords { get; init; }
    public bool IncomeIsUnknown { get; init; }
    public bool ExpensesAreUnknown { get; init; }
    public bool AreaIsMissing { get; init; }
    public bool OilQuantityIsMissing { get; init; }
    public bool IncludesUnassigned { get; init; }
}

/// <summary>
/// Shared year-result read model for a field: executions, posted money (same as Money),
/// confirmed harvests, phenology, and weather/warning coverage.
/// </summary>
public sealed class FieldYearSummary
{
    public string FieldId { get; init; } = string.Empty;
    public string FieldName { get; init; } = string.Empty;
    public int ResultYear { get; init; }
    public string Currency { get; init; } = "EUR";

    public decimal? TotalIncome { get; init; }
    public decimal? TotalExpenses { get; init; }
    public decimal? NetResult { get; init; }
    public string ResultLabel { get; init; } = string.Empty;
    public decimal? CostPerKilogramOfOil { get; init; }
    public decimal? OilKilograms { get; init; }
    public decimal? OliveKilograms { get; init; }
    public OliveOilEconomics OliveOil { get; init; } = new();

    public int PostedTransactionCount { get; init; }
    public int DraftTransactionCount { get; init; }
    public int CompletedExecutionCount { get; init; }
    public int PartialExecutionCount { get; init; }
    public int ConfirmedHarvestCount { get; init; }
    public int PhenologyObservationCount { get; init; }
    public int WeatherReviewCount { get; init; }
    public int ActiveOfficialWarningCount { get; init; }

    public FinancialDataAvailability DataAvailability { get; init; } = new();
}
