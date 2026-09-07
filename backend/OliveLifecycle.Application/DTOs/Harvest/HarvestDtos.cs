namespace OliveLifecycle.Application.DTOs.Harvest;

public class CreateHarvestRecordDto
{
    public string FieldId { get; set; } = string.Empty;
    public DateTime? HarvestDate { get; set; }
    public string? HarvestMethod { get; set; }
    public int WorkersUsed { get; set; }
    public double OliveKg { get; set; }
    public string? MillName { get; set; }
    public double? OilKg { get; set; }
    public double? OilYieldPercent { get; set; }
    public string? QualityGrade { get; set; }
    public string? Notes { get; set; }
    public decimal? SaleAmount { get; set; }
    public decimal? MillCost { get; set; }
}

public class HarvestRecordDetailDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public DateTime HarvestDate { get; set; }
    public string HarvestMethod { get; set; } = string.Empty;
    public int WorkersUsed { get; set; }
    public double OliveKg { get; set; }
    public string? MillName { get; set; }
    public double? OilKg { get; set; }
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
