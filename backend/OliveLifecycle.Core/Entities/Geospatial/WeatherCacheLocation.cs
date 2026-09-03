namespace OliveLifecycle.Core.Entities.Geospatial;

public class WeatherCacheLocation : BaseEntity
{
    public string GridKey { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string? Model { get; set; }
    public DateTime FetchedAt { get; set; }
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public List<HourlyForecastEntry> HourlyForecast { get; set; } = new();
}
