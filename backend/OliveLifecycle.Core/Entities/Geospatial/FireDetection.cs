namespace OliveLifecycle.Core.Entities.Geospatial;

public class FireDetection : BaseEntity
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public DateTime DetectedAt { get; set; }
    public string? Confidence { get; set; }
    public double? BrightnessKelvin { get; set; }
    public double? FireRadiativePowerMw { get; set; }
    public string? Satellite { get; set; }
    public string? DayNight { get; set; }
    public string Source { get; set; } = "VIIRS";
}
