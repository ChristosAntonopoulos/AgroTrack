using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Core.Entities.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Providers;

public class OpenMeteoWeatherProvider : IWeatherProvider
{
    private readonly HttpClient _httpClient;
    private readonly WeatherOptions _options;
    private readonly ILogger<OpenMeteoWeatherProvider> _logger;

    public string ProviderName => "Open-Meteo";

    public OpenMeteoWeatherProvider(HttpClient httpClient, IOptions<GeospatialOptions> options, ILogger<OpenMeteoWeatherProvider> logger)
    {
        _httpClient = httpClient;
        _options = options.Value.Weather;
        _logger = logger;
    }

    public async Task<WeatherForecastResult> FetchForecastAsync(double latitude, double longitude, CancellationToken cancellationToken = default)
    {
        // Times are requested in UTC because every downstream comparison and stored
        // timestamp is UTC. past_days gives the rain/ET history the intelligence needs.
        var url = $"{_options.BaseUrl.TrimEnd('/')}/forecast?" +
                  $"latitude={latitude.ToString(CultureInfo.InvariantCulture)}&longitude={longitude.ToString(CultureInfo.InvariantCulture)}" +
                  "&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,rain,showers,precipitation_probability,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,surface_pressure,shortwave_radiation,et0_fao_evapotranspiration,soil_temperature_0cm,soil_moisture_0_to_1cm,weather_code" +
                  "&timezone=UTC" +
                  $"&forecast_days={_options.ForecastDays}&past_days={_options.PastDays}&models=best_match";

        if (!string.IsNullOrEmpty(_options.ApiKey))
            url += $"&apikey={_options.ApiKey}";

        var response = await _httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);

        var hourly = json.GetProperty("hourly");
        var times = hourly.GetProperty("time").EnumerateArray()
            .Select(e => DateTime.SpecifyKind(
                DateTime.Parse(e.GetString()!, CultureInfo.InvariantCulture, DateTimeStyles.None),
                DateTimeKind.Utc))
            .ToList();
        var entries = new List<HourlyForecastEntry>();
        for (var i = 0; i < times.Count; i++)
        {
            entries.Add(new HourlyForecastEntry
            {
                Time = times[i],
                TemperatureC = GetArrayDouble(hourly, "temperature_2m", i),
                ApparentTemperatureC = GetArrayDouble(hourly, "apparent_temperature", i),
                HumidityPercent = GetArrayDouble(hourly, "relative_humidity_2m", i),
                DewPointC = GetArrayDouble(hourly, "dew_point_2m", i),
                PrecipitationMm = GetArrayDouble(hourly, "precipitation", i),
                RainMm = GetArrayDouble(hourly, "rain", i),
                ShowersMm = GetArrayDouble(hourly, "showers", i),
                PrecipitationProbabilityPercent = GetArrayDouble(hourly, "precipitation_probability", i),
                WindSpeedKmh = GetArrayDouble(hourly, "wind_speed_10m", i),
                WindDirectionDegrees = GetArrayDouble(hourly, "wind_direction_10m", i),
                WindGustKmh = GetArrayDouble(hourly, "wind_gusts_10m", i),
                CloudCoverPercent = GetArrayDouble(hourly, "cloud_cover", i),
                SurfacePressureHpa = GetArrayDouble(hourly, "surface_pressure", i),
                SolarRadiationWm2 = GetArrayDouble(hourly, "shortwave_radiation", i),
                Et0Mm = GetArrayDouble(hourly, "et0_fao_evapotranspiration", i),
                SoilTemperatureC = GetArrayDouble(hourly, "soil_temperature_0cm", i),
                SoilMoisture = GetArrayDouble(hourly, "soil_moisture_0_to_1cm", i),
                WeatherCode = GetArrayInt(hourly, "weather_code", i)
            });
        }

        _logger.LogInformation("Fetched Open-Meteo forecast for {Lat},{Lng} with {Hours} hourly entries", latitude, longitude, entries.Count);
        return new WeatherForecastResult
        {
            Provider = ProviderName,
            Model = "best_match",
            SourceResolution = "~1-11 km",
            FetchedAt = DateTime.UtcNow,
            ValidFrom = entries.FirstOrDefault()?.Time ?? DateTime.UtcNow,
            ValidTo = entries.LastOrDefault()?.Time ?? DateTime.UtcNow.AddDays(7),
            HourlyForecast = entries
        };
    }

    public async Task<WeatherArchiveResult> FetchArchiveDailyAsync(
        double latitude,
        double longitude,
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default)
    {
        if (to < from)
        {
            return new WeatherArchiveResult { Provider = ProviderName, Model = "era5_seamless" };
        }

        var url = $"{_options.ArchiveBaseUrl.TrimEnd('/')}/archive?" +
                  $"latitude={latitude.ToString(CultureInfo.InvariantCulture)}&longitude={longitude.ToString(CultureInfo.InvariantCulture)}" +
                  $"&start_date={from:yyyy-MM-dd}&end_date={to:yyyy-MM-dd}" +
                  "&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,rain_sum," +
                  "et0_fao_evapotranspiration,wind_speed_10m_max,wind_speed_10m_mean,wind_gusts_10m_max,shortwave_radiation_sum" +
                  "&timezone=UTC";

        if (!string.IsNullOrEmpty(_options.ApiKey))
            url += $"&apikey={_options.ApiKey}";

        var response = await _httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);

        if (!json.TryGetProperty("daily", out var daily))
        {
            return new WeatherArchiveResult { Provider = ProviderName, Model = "era5_seamless" };
        }

        var dates = daily.TryGetProperty("time", out var timeArray)
            ? timeArray.EnumerateArray()
                .Select(e => DateOnly.Parse(e.GetString()!, CultureInfo.InvariantCulture))
                .ToList()
            : [];

        var days = new List<DailyWeatherArchiveDay>(dates.Count);
        for (var i = 0; i < dates.Count; i++)
        {
            var rain = GetArrayDouble(daily, "rain_sum", i) ?? GetArrayDouble(daily, "precipitation_sum", i);
            var radiationMj = GetArrayDouble(daily, "shortwave_radiation_sum", i);
            days.Add(new DailyWeatherArchiveDay
            {
                Date = dates[i],
                MinTemperatureC = GetArrayDouble(daily, "temperature_2m_min", i),
                MaxTemperatureC = GetArrayDouble(daily, "temperature_2m_max", i),
                AverageTemperatureC = GetArrayDouble(daily, "temperature_2m_mean", i),
                RainTotalMm = rain,
                Et0Mm = GetArrayDouble(daily, "et0_fao_evapotranspiration", i),
                MaximumWindSpeedKmh = GetArrayDouble(daily, "wind_speed_10m_max", i),
                AverageWindSpeedKmh = GetArrayDouble(daily, "wind_speed_10m_mean", i),
                MaximumWindGustKmh = GetArrayDouble(daily, "wind_gusts_10m_max", i),
                // Archive reports MJ/m²/day; convert to an equivalent daily-mean W/m².
                SolarRadiationWm2 = radiationMj.HasValue ? radiationMj.Value * 1_000_000d / 86_400d : null
            });
        }

        _logger.LogInformation(
            "Fetched Open-Meteo archive for {Lat},{Lng} from {From} to {To} ({Days} days)",
            latitude, longitude, from, to, days.Count);

        return new WeatherArchiveResult
        {
            Provider = ProviderName,
            Model = "era5_seamless",
            Days = days
        };
    }

    private static double? GetArrayDouble(JsonElement parent, string name, int index)
    {
        if (!parent.TryGetProperty(name, out var arr) || index >= arr.GetArrayLength()) return null;
        var el = arr[index];
        return el.ValueKind == JsonValueKind.Null ? null : el.GetDouble();
    }

    private static int? GetArrayInt(JsonElement parent, string name, int index)
    {
        if (!parent.TryGetProperty(name, out var arr) || index >= arr.GetArrayLength()) return null;
        var el = arr[index];
        return el.ValueKind == JsonValueKind.Null ? null : el.GetInt32();
    }
}
