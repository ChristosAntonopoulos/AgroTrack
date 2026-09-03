namespace OliveLifecycle.Core.ValueObjects.Geospatial;

public class WeatherSummary
{
    public double? CurrentTemperatureC { get; set; }
    public double? RainNext24hMm { get; set; }
    public double? WindSpeedKmh { get; set; }
    public string? FrostRiskLevel { get; set; }
    public string? FrostWindow { get; set; }
    public double? ForecastMinTempC { get; set; }
    public double? ForecastMaxTempC { get; set; }
    public DataSourceMetadata Metadata { get; set; } = new();
}
