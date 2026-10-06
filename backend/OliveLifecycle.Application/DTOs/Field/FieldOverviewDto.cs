namespace OliveLifecycle.Application.DTOs.Field;

public class FieldOverviewDto
{
    public FieldOverviewIdentityDto Field { get; set; } = new();
    public FieldOverviewCurrentDto Current { get; set; } = new();
    public FieldOverviewProductionDto Production { get; set; } = new();
    public FieldOverviewMoneyDto Money { get; set; } = new();
    public FieldOverviewWeatherDto Weather { get; set; } = new();
    public IReadOnlyList<FieldHistoryPreviewItemDto> RecentHistory { get; set; } = [];
    public IReadOnlyList<FieldPhotoPreviewItemDto> Photos { get; set; } = [];
    public FieldOverviewCropYearDto CropYear { get; set; } = new();
}

public class FieldOverviewIdentityDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string LocationLabel { get; set; } = string.Empty;
    public string? Variety { get; set; }
    public double? AreaStremmata { get; set; }
    public int? TreeCount { get; set; }
    public string? IrrigationLabel { get; set; }
    public string BoundaryStatus { get; set; } = "missing";
    public string Status { get; set; } = "Active";
}

public class FieldOverviewCurrentDto
{
    public string? LifecycleStage { get; set; }
    public FieldOverviewAttentionDto? PrimaryAttention { get; set; }
    public FieldOverviewLatestRecordDto? LatestRecord { get; set; }
}

public class FieldOverviewAttentionDto
{
    public string Label { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
    public string? Href { get; set; }
}

public class FieldOverviewLatestRecordDto
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public string Href { get; set; } = string.Empty;
}

public class FieldOverviewProductionDto
{
    public decimal HarvestOliveKg { get; set; }
    public decimal OilProducedLitres { get; set; }
    public decimal OilCurrentlyInCellarLitres { get; set; }
    public decimal OilHeldLitres { get; set; }
    public bool HasOilEntries { get; set; }
}

public class FieldOverviewMoneyDto
{
    public decimal PostedIncome { get; set; }
    public decimal PostedExpense { get; set; }
    public decimal Result { get; set; }
    public string Currency { get; set; } = "EUR";
}

public class FieldOverviewWeatherDto
{
    public string Headline { get; set; } = string.Empty;
    public string? Recommendation { get; set; }
    public double? EstimatedWaterNeedMm { get; set; }
    public string? SourceLabel { get; set; }
}

public class FieldHistoryPreviewItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public DateTime OccurredAt { get; set; }
    public string Href { get; set; } = string.Empty;
    public decimal? Amount { get; set; }
    public string? Currency { get; set; }
}

public class FieldPhotoPreviewItemDto
{
    public string Id { get; set; } = string.Empty;
    public string? Url { get; set; }
    public string? ThumbnailUrl { get; set; }
    public DateTime? CapturedAt { get; set; }
}

public class FieldOverviewCropYearDto
{
    public int Id { get; set; }
    public string Label { get; set; } = string.Empty;
}
