using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

public class HarvestRecord : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public DateTime HarvestDate { get; set; } = DateTime.UtcNow;
    public string HarvestMethod { get; set; } = string.Empty;
    public int WorkersUsed { get; set; }
    public double OliveKg { get; set; }
    public string? MillName { get; set; }
    public double? OilKg { get; set; }
    public double? OilYieldPercent { get; set; }
    public string QualityGrade { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public FinancialEntryStatus Status { get; set; } = FinancialEntryStatus.Posted;
    public string? VoidReason { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidedBy { get; set; }
}
