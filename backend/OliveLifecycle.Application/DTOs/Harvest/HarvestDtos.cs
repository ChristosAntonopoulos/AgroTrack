namespace OliveLifecycle.Application.DTOs.Harvest;

public class CreateHarvestRecordDto
{
    public string FieldId { get; set; } = string.Empty;
    public DateTime? HarvestDate { get; set; }
    /// <summary>Optional olive result year; defaults to Athens year of HarvestDate.</summary>
    public int? ResultYear { get; set; }
    public string? HarvestMethod { get; set; }
    public int WorkersUsed { get; set; }
    public double OliveKg { get; set; }
    public string? MillName { get; set; }
    public double? OilKg { get; set; }
    public decimal? OilLitres { get; set; }
    public decimal? ConversionFactor { get; set; }
    public string? ConversionSource { get; set; }
    public DateTime? ConversionRecordedAt { get; set; }
    public double? OilYieldPercent { get; set; }
    public string? QualityGrade { get; set; }
    public string? Notes { get; set; }
    public decimal? SaleAmount { get; set; }
    public decimal? MillCost { get; set; }
    public List<string>? MediaUrls { get; set; }
}

public class HarvestRecordDetailDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public DateTime HarvestDate { get; set; }
    public int ResultYear { get; set; }
    public string HarvestMethod { get; set; } = string.Empty;
    public int WorkersUsed { get; set; }
    public double OliveKg { get; set; }
    public string? MillName { get; set; }
    public double? OilKg { get; set; }
    public decimal? OilLitres { get; set; }
    public decimal? ConversionFactor { get; set; }
    public string? ConversionSource { get; set; }
    public DateTime? ConversionRecordedAt { get; set; }
    public double? OilYieldPercent { get; set; }
    public string QualityGrade { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Status { get; set; } = "posted";
    public string? VoidReason { get; set; }
    public DateTime? VoidedAt { get; set; }
}

public class VoidHarvestRecordDto
{
    public string? Reason { get; set; }
}
