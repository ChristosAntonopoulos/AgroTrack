namespace OliveLifecycle.Core.FieldWork;

/// <summary>Official product label constraints used when ranking plant-protection weather suitability.</summary>
public class PlantProtectionProductLabel
{
    public string ProductName { get; set; } = string.Empty;
    public string? ProductCode { get; set; }

    /// <summary>Hours without rain required after application (rainfast).</summary>
    public double? RainfastHours { get; set; }

    public double? MaxWindKmh { get; set; }
    public double? MaxGustKmh { get; set; }
    public double? MinHumidityPercent { get; set; }
    public double? MaxHumidityPercent { get; set; }

    /// <summary>When false, ranking stays Unknown until authorisation is verified.</summary>
    public bool? IsApprovedForCropAndTarget { get; set; }

    public bool HasUsableConstraints =>
        RainfastHours.HasValue
        || MaxWindKmh.HasValue
        || MaxGustKmh.HasValue
        || MinHumidityPercent.HasValue
        || MaxHumidityPercent.HasValue
        || IsApprovedForCropAndTarget.HasValue;
}
