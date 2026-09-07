using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

public class FinancialEntry : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public string LifecycleYear { get; set; } = "low";
    public string? TaskId { get; set; }
    public string? HarvestId { get; set; }
    public FinancialEntryKind Kind { get; set; } = FinancialEntryKind.Expense;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public string Description { get; set; } = string.Empty;
    public FinancialCategoryBucket? Bucket { get; set; }
    public FinancialCategory? Category { get; set; }
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal? UnitPrice { get; set; }
    public DateTime OccurredOn { get; set; } = DateTime.UtcNow;
    public FinancialEntryStatus Status { get; set; } = FinancialEntryStatus.Posted;
    public string RecordedBy { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? VoidReason { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidedBy { get; set; }
}
