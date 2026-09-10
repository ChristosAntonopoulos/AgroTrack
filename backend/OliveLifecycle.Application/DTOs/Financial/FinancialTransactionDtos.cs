namespace OliveLifecycle.Application.DTOs.Financial;

public class FinancialTransactionDto
{
    public string Id { get; set; } = string.Empty;
    public string OwnerUserId { get; set; } = string.Empty;
    public string Type { get; set; } = "expense";
    public string TypeLabel { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public string StatusLabel { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public DateTime OccurredOn { get; set; }
    public int ResultYear { get; set; }
    public string? FieldId { get; set; }
    public string? Category { get; set; }
    public string? CategoryLabel { get; set; }
    public string? ProductKind { get; set; }
    public decimal? Quantity { get; set; }
    public string? QuantityUnit { get; set; }
    public string? QuantityUnitLabel { get; set; }
    public string? QuantityUnitAbbreviation { get; set; }
    public decimal? UnitPrice { get; set; }
    public string CalculationMode { get; set; } = "total_only";
    public bool AmountIsCalculated { get; set; }
    public bool UnitPriceIsCalculated { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? PaymentMethod { get; set; }
    public string? CounterpartyName { get; set; }
    public string? RelatedTaskId { get; set; }
    public string? RelatedHarvestId { get; set; }
    public string? RelatedCollaboratorId { get; set; }
    public string SourceType { get; set; } = "manual";
    public string SourceTypeLabel { get; set; } = string.Empty;
    public string? SourceId { get; set; }
    public List<string> AttachmentIds { get; set; } = [];
    public string? Notes { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? PostedAt { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidReason { get; set; }
    public string? VoidedByUserId { get; set; }
}

public class CreateFinancialTransactionDto
{
    public string Type { get; set; } = "expense";
    public decimal? Amount { get; set; }
    public string? Currency { get; set; }
    public DateTime? OccurredOn { get; set; }
    public int? ResultYear { get; set; }
    public string? FieldId { get; set; }
    public string? Category { get; set; }
    public string? ProductKind { get; set; }
    public decimal? Quantity { get; set; }
    public string? QuantityUnit { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? CalculationMode { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? PaymentMethod { get; set; }
    public string? CounterpartyName { get; set; }
    public string? RelatedTaskId { get; set; }
    public string? RelatedHarvestId { get; set; }
    public string? RelatedCollaboratorId { get; set; }
    public string? SourceType { get; set; }
    public string? SourceId { get; set; }
    public List<string>? AttachmentIds { get; set; }
    public string? Notes { get; set; }
    public string? IdempotencyKey { get; set; }
    public bool SaveAsDraft { get; set; }
}

public class UpdateFinancialTransactionDto
{
    public decimal? Amount { get; set; }
    public DateTime? OccurredOn { get; set; }
    public int? ResultYear { get; set; }
    public string? FieldId { get; set; }
    public bool ClearField { get; set; }
    public string? Category { get; set; }
    public string? ProductKind { get; set; }
    public decimal? Quantity { get; set; }
    public string? QuantityUnit { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? CalculationMode { get; set; }
    public bool ClearQuantity { get; set; }
    public string? Description { get; set; }
    public string? PaymentMethod { get; set; }
    public string? CounterpartyName { get; set; }
    public string? RelatedTaskId { get; set; }
    public string? RelatedHarvestId { get; set; }
    public string? RelatedCollaboratorId { get; set; }
    public List<string>? AttachmentIds { get; set; }
    public string? Notes { get; set; }
}

public class VoidFinancialTransactionDto
{
    public string Reason { get; set; } = string.Empty;
}

public class FinancialTransactionListDto
{
    public IReadOnlyList<FinancialTransactionDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class FinancialTransactionListQuery
{
    public int? ResultYear { get; set; }
    public string? FieldId { get; set; }
    public string? Type { get; set; }
    public string? Status { get; set; }
    public string? Category { get; set; }
    public int? Month { get; set; }
    public string? RelatedTaskId { get; set; }
    public string? RelatedHarvestId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class YearFinancialSummaryDto
{
    public int Year { get; set; }
    public string Currency { get; set; } = "EUR";
    public string? FieldId { get; set; }
    public decimal? TotalIncome { get; set; }
    public decimal? TotalExpenses { get; set; }
    public decimal? NetResult { get; set; }
    public string ResultLabel { get; set; } = string.Empty;
    public int TransactionCount { get; set; }
    public int DraftCount { get; set; }
    public DateTime? LastPostedAt { get; set; }
    public IReadOnlyList<MonthlyFinancialResultDto> MonthlyResults { get; set; } = [];
    public IReadOnlyList<FieldFinancialResultDto> FieldResults { get; set; } = [];
    public IReadOnlyList<CategoryFinancialResultDto> IncomeByCategory { get; set; } = [];
    public IReadOnlyList<CategoryFinancialResultDto> ExpenseByCategory { get; set; } = [];
    public decimal? CostPerHectare { get; set; }
    public decimal? IncomePerHectare { get; set; }
    public decimal? NetPerHectare { get; set; }
    public decimal? CostPerKilogramOfOil { get; set; }
    public string? CostPerKilogramMessage { get; set; }
    public OliveOilEconomicsDto OliveOil { get; set; } = new();
    public FinancialDataAvailabilityDto DataAvailability { get; set; } = new();
}

public class MonthlyFinancialResultDto
{
    public int Month { get; set; }
    public decimal? Income { get; set; }
    public decimal? Expenses { get; set; }
    public decimal? NetResult { get; set; }
    public bool HasRecords { get; set; }
    public string EmptyLabel { get; set; } = string.Empty;
}

public class FieldFinancialResultDto
{
    public string? FieldId { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public bool IsUnassigned { get; set; }
    public decimal? Income { get; set; }
    public decimal? Expenses { get; set; }
    public decimal? NetResult { get; set; }
    public decimal? CostPerHectare { get; set; }
    public decimal? IncomePerHectare { get; set; }
    public decimal? NetPerHectare { get; set; }
    public int TransactionCount { get; set; }
}

public class CategoryFinancialResultDto
{
    public string Category { get; set; } = string.Empty;
    public string CategoryLabel { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal? PercentageOfTotal { get; set; }
}

public class HarvestFinancialSummaryDto
{
    public string HarvestId { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public decimal? Income { get; set; }
    public decimal? Expenses { get; set; }
    public decimal? NetResult { get; set; }
    public bool HasRecordedIncome { get; set; }
    public bool HasRecordedExpenses { get; set; }
    public string? IncomeMessage { get; set; }
    public int TransactionCount { get; set; }
    public FinancialDataAvailabilityDto DataAvailability { get; set; } = new();
}

public class TaskFinancialSummaryDto
{
    public string TaskId { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public decimal? EstimatedCost { get; set; }
    public decimal? ActualCost { get; set; }
    public decimal? Difference { get; set; }
    public int TransactionCount { get; set; }
    public FinancialDataAvailabilityDto DataAvailability { get; set; } = new();
}

public class FinancialDataAvailabilityDto
{
    public bool HasPostedRecords { get; set; }
    public bool HasDraftRecords { get; set; }
    public bool IncomeIsUnknown { get; set; }
    public bool ExpensesAreUnknown { get; set; }
    public bool AreaIsMissing { get; set; }
    public bool OilQuantityIsMissing { get; set; }
    public bool IncludesUnassigned { get; set; }
}

public class OliveOilEconomicsDto
{
    public decimal? ProducedLitres { get; set; }
    public bool ProducedLitresAreEstimated { get; set; }
    public decimal? SoldLitres { get; set; }
    public decimal? RemainingLitres { get; set; }
    public bool RemainingIsConfirmed { get; set; }
    public decimal? AverageSalePricePerLitre { get; set; }
    public decimal? ProductionCostPerLitre { get; set; }
    public decimal? ResultPerLitre { get; set; }
    public int PostedOliveOilSaleCount { get; set; }
    public int PostedOliveOilSalesMissingLitres { get; set; }
    public bool HasProductionOrSales { get; set; }
    public string? ProductionCostMessage { get; set; }
    public string? AveragePriceMessage { get; set; }
    public string? RemainingMessage { get; set; }
}
