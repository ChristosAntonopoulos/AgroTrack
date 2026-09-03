namespace OliveLifecycle.Core.Entities.Geospatial;

public class FieldDailyWeatherSnapshot : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public double? MinTemperatureC { get; set; }
    public double? MaxTemperatureC { get; set; }
    public double? AverageTemperatureC { get; set; }
    public double? MinHumidityPercent { get; set; }
    public double? MaxHumidityPercent { get; set; }
    public double? AverageHumidityPercent { get; set; }
    public double? RainTotalMm { get; set; }
    public double? MaximumWindSpeedKmh { get; set; }
    public double? AverageWindSpeedKmh { get; set; }
    public double? MaximumWindGustKmh { get; set; }
    public double? Et0Mm { get; set; }
    public double? SolarRadiationWm2 { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string? Model { get; set; }
    public string? SourceResolution { get; set; }
}
