using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

public class HarvestRecord : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public DateTime HarvestDate { get; set; } = DateTime.UtcNow;
    /// <summary>
    /// Olive result year this harvest counts toward. Defaults to Athens calendar year of HarvestDate;
    /// may remain the previous year for January continuation.
    /// </summary>
    public int ResultYear { get; set; }
    public string HarvestMethod { get; set; } = string.Empty;
    public int WorkersUsed { get; set; }
    public double OliveKg { get; set; }
    public string? MillName { get; set; }
    public double? OilKg { get; set; }
    /// <summary>Confirmed mill litres. Never inferred from kilograms.</summary>
    public decimal? OilLitres { get; set; }
    /// <summary>Kilograms per litre when the mill provided an explicit conversion. Used only as an estimate.</summary>
    public decimal? ConversionFactor { get; set; }
    public string? ConversionSource { get; set; }
    public DateTime? ConversionRecordedAt { get; set; }
    public double? OilYieldPercent { get; set; }
    public string QualityGrade { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public FinancialEntryStatus Status { get; set; } = FinancialEntryStatus.Posted;
    public string? VoidReason { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidedBy { get; set; }
}
