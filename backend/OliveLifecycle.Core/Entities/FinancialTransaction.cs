using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

public class FinancialTransaction : BaseEntity
{
    public string OwnerUserId { get; set; } = string.Empty;
    public FinancialTransactionType Type { get; set; } = FinancialTransactionType.Expense;
    public FinancialTransactionStatus Status { get; set; } = FinancialTransactionStatus.Draft;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public DateTime OccurredOn { get; set; } = DateTime.UtcNow;
    public int ResultYear { get; set; }
    public string? FieldId { get; set; }
    public FinancialTransactionCategory? Category { get; set; }
    public FinancialProductKind? ProductKind { get; set; }
    public decimal? Quantity { get; set; }
    public FinancialQuantityUnit? QuantityUnit { get; set; }
    public decimal? UnitPrice { get; set; }
    public FinancialCalculationMode CalculationMode { get; set; } = FinancialCalculationMode.TotalOnly;
    public string Description { get; set; } = string.Empty;
    public string? PaymentMethod { get; set; }
    public string? CounterpartyName { get; set; }
    public string? RelatedTaskId { get; set; }
    public string? RelatedHarvestId { get; set; }
    public string? RelatedCollaboratorId { get; set; }
    public FinancialTransactionSourceType SourceType { get; set; } = FinancialTransactionSourceType.Manual;
    public string? SourceId { get; set; }
    public List<string> AttachmentIds { get; set; } = [];
    public string? Notes { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime? PostedAt { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidReason { get; set; }
    public string? VoidedByUserId { get; set; }
}
