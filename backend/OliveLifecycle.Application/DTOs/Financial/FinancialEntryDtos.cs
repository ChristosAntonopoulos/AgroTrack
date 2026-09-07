namespace OliveLifecycle.Application.DTOs.Financial;

public class FinancialEntryDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string LifecycleYear { get; set; } = "low";
    public string? TaskId { get; set; }
    public string? HarvestId { get; set; }
    public string Kind { get; set; } = "expense";
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public string Description { get; set; } = string.Empty;
    public string? Bucket { get; set; }
    public string? Category { get; set; }
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal? UnitPrice { get; set; }
    public DateTime OccurredOn { get; set; }
    public string Status { get; set; } = "posted";
    public string RecordedBy { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? VoidReason { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateFinancialEntryDto
{
    public string FieldId { get; set; } = string.Empty;
    public decimal? Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Currency { get; set; }
    public string? Kind { get; set; }
    public string? Bucket { get; set; }
    public string? Category { get; set; }
    public string? TaskId { get; set; }
    public string? HarvestId { get; set; }
    public string? LifecycleYear { get; set; }
    public DateTime? OccurredOn { get; set; }
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? Notes { get; set; }
}

public class UpdateFinancialEntryDto
{
    public decimal? Amount { get; set; }
    public string? Description { get; set; }
    public string? Bucket { get; set; }
    public string? Category { get; set; }
    public DateTime? OccurredOn { get; set; }
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? Notes { get; set; }
}

public class VoidFinancialEntryDto
{
    public string? Reason { get; set; }
}

public class FieldFinancialSummaryDto
{
    public string FieldId { get; set; } = string.Empty;
    public string Currency { get; set; } = "EUR";
    public string? LifecycleYear { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal Net { get; set; }
    public int PostedCount { get; set; }
    public decimal ThisWeekExpenses { get; set; }
    public Dictionary<string, decimal> ExpensesByBucket { get; set; } = new();
}

public class FinancialOverviewDto
{
    public string Currency { get; set; } = "EUR";
    public decimal ThisWeekExpenses { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal Net { get; set; }
    public int PostedCount { get; set; }
    public int FieldCount { get; set; }
    public List<FieldWeekCostDto> TopFields { get; set; } = new();
}

public class FieldWeekCostDto
{
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public decimal ThisWeekExpenses { get; set; }
}
