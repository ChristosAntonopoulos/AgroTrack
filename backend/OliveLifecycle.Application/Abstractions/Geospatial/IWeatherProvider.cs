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

public class DailyWeatherArchiveDay
{
    public DateOnly Date { get; set; }
    public double? MinTemperatureC { get; set; }
    public double? MaxTemperatureC { get; set; }
    public double? AverageTemperatureC { get; set; }
    public double? RainTotalMm { get; set; }
    public double? Et0Mm { get; set; }
    public double? MaximumWindSpeedKmh { get; set; }
    public double? AverageWindSpeedKmh { get; set; }
    public double? MaximumWindGustKmh { get; set; }
    public double? SolarRadiationWm2 { get; set; }
}

public class WeatherArchiveResult
{
    public string Provider { get; set; } = string.Empty;
    public string? Model { get; set; }
    public List<DailyWeatherArchiveDay> Days { get; set; } = new();
}

public interface IWeatherProvider
{
    string ProviderName { get; }
    Task<WeatherForecastResult> FetchForecastAsync(double latitude, double longitude, CancellationToken cancellationToken = default);

    /// <summary>Daily modelled weather from the historical archive (ERA5 / Open-Meteo archive).</summary>
    Task<WeatherArchiveResult> FetchArchiveDailyAsync(
        double latitude,
        double longitude,
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default);
}
