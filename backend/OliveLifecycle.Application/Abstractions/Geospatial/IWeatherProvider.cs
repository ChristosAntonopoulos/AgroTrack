using OliveLifecycle.Core.Entities.Geospatial;

namespace OliveLifecycle.Application.Abstractions.Geospatial;

public class WeatherForecastResult
{
    public string Provider { get; set; } = string.Empty;
    public string? Model { get; set; }
    public string? SourceResolution { get; set; }
    public DateTime FetchedAt { get; set; }
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public List<HourlyForecastEntry> HourlyForecast { get; set; } = new();
}

public interface IWeatherProvider
{
    string ProviderName { get; }
    Task<WeatherForecastResult> FetchForecastAsync(double latitude, double longitude, CancellationToken cancellationToken = default);
}
