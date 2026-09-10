using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.DTOs.Geospatial;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Services.Geospatial;

public interface IWeatherIntelligenceService
{
    string ComputeGridKey(double latitude, double longitude);
    Task<WeatherCacheLocation> RefreshLocationAsync(double latitude, double longitude, CancellationToken cancellationToken = default);
    Task<FieldWeatherDto> GetFieldWeatherAsync(Field field, CancellationToken cancellationToken = default);
    /// <summary>Returns null when the provider window does not cover the requested day.</summary>
    Task<FieldDailyWeatherSnapshot?> CreateDailySnapshotAsync(Field field, DateOnly date, CancellationToken cancellationToken = default);

    /// <summary>
    /// Writes daily weather snapshots from the historical archive after the field
    /// has been activated. Existing days are left untouched.
    /// </summary>
    Task<int> BackfillHistoryAsync(Field field, CancellationToken cancellationToken = default);
}

public class WeatherIntelligenceService : IWeatherIntelligenceService
{
    /// <summary>
    /// Weather comes from a numerical model grid, not from the field itself. Surfacing this
    /// everywhere keeps users from reading a forecast as a field-level measurement.
    /// </summary>
    internal const string SourceResolution = "~1-11 km";

    private readonly IWeatherProvider _weatherProvider;
    private readonly IWeatherCacheRepository _weatherCacheRepository;
    private readonly IFieldDailyWeatherSnapshotRepository _snapshotRepository;
    private readonly IFieldTaskRepository _fieldTasks;
    private readonly ITaskExecutionRepository _executions;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly GeospatialOptions _options;
    private readonly ILogger<WeatherIntelligenceService> _logger;

    public WeatherIntelligenceService(
        IWeatherProvider weatherProvider,
        IWeatherCacheRepository weatherCacheRepository,
        IFieldDailyWeatherSnapshotRepository snapshotRepository,
        IFieldTaskRepository fieldTasks,
        ITaskExecutionRepository executions,
        IDateTimeProvider dateTimeProvider,
        IOptions<GeospatialOptions> options,
        ILogger<WeatherIntelligenceService> logger)
    {
        _weatherProvider = weatherProvider;
        _weatherCacheRepository = weatherCacheRepository;
        _snapshotRepository = snapshotRepository;
        _fieldTasks = fieldTasks;
        _executions = executions;
        _dateTimeProvider = dateTimeProvider;
        _options = options.Value;
        _logger = logger;
    }

    public string ComputeGridKey(double latitude, double longitude)
    {
        var d = _options.Weather.GridRoundingDecimals;
        return $"{Math.Round(latitude, d):F2},{Math.Round(longitude, d):F2}";
    }

    public async Task<WeatherCacheLocation> RefreshLocationAsync(double latitude, double longitude, CancellationToken cancellationToken = default)
    {
        var gridKey = ComputeGridKey(latitude, longitude);
        var forecast = await _weatherProvider.FetchForecastAsync(latitude, longitude, cancellationToken);
        var existing = await _weatherCacheRepository.GetByGridKeyAsync(gridKey, cancellationToken);
        var location = existing ?? new WeatherCacheLocation { GridKey = gridKey, Latitude = latitude, Longitude = longitude };
        location.Provider = forecast.Provider;
        location.Model = forecast.Model;
        location.FetchedAt = forecast.FetchedAt;
        location.ValidFrom = forecast.ValidFrom;
        location.ValidTo = forecast.ValidTo;
        location.HourlyForecast = forecast.HourlyForecast;
        location.UpdatedAt = _dateTimeProvider.UtcNow;
        if (string.IsNullOrEmpty(location.Id))
        {
            location.Id = Guid.NewGuid().ToString("N");
            location.CreatedAt = _dateTimeProvider.UtcNow;
        }
        return await _weatherCacheRepository.UpsertAsync(location, cancellationToken);
    }

    public async Task<FieldWeatherDto> GetFieldWeatherAsync(Field field, CancellationToken cancellationToken = default)
    {
        var (lat, lng) = ResolveCoordinates(field);
        var cache = await _weatherCacheRepository.GetByGridKeyAsync(ComputeGridKey(lat, lng), cancellationToken);
        var stale = false;
        if (cache == null || cache.FetchedAt < _dateTimeProvider.UtcNow.AddMinutes(-_options.Weather.RefreshMinutes))
        {
            try
            {
                cache = await RefreshLocationAsync(lat, lng, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Weather provider unavailable for field {FieldId}", field.Id);
                stale = cache != null;
                if (cache == null)
                {
                    // No cache and no provider: return an empty-but-valid payload so the
                    // field screen degrades to "weather unavailable" instead of erroring.
                    return new FieldWeatherDto
                    {
                        FieldId = field.Id,
                        Stale = true,
                        Metadata = BuildMetadata(_weatherProvider.ProviderName, default)
                    };
                }
            }
        }

        var now = _dateTimeProvider.UtcNow;
        var hourly = cache!.HourlyForecast.OrderBy(h => h.Time).ToList();
        var current = hourly.LastOrDefault(h => h.Time <= now) ?? hourly.FirstOrDefault();
        var next7d = hourly.Where(h => h.Time > now && h.Time <= now.AddDays(7)).ToList();
        var past = hourly.Where(h => h.Time <= now).ToList();
        var frost = ComputeFrostRisk(hourly, now);
        var rain = ComputeRainIntelligence(past, next7d, now);
        var wind = ComputeWindIntelligence(hourly, now);
        var et0Today = hourly.Where(h => h.Time.Date == now.Date).Sum(h => h.Et0Mm ?? 0);
        // Same 7-day window as Rain.Previous7dMm so the water balance compares like with like.
        var et07d = hourly.Where(h => h.Time > now.AddDays(-7) && h.Time <= now).Sum(h => h.Et0Mm ?? 0);
        var irrigationMm = await GetIrrigationMmAsync(field.Id, now.AddDays(-7), cancellationToken);
        var dailyTemps = hourly.Where(h => h.Time.Date == now.Date && h.TemperatureC.HasValue).Select(h => h.TemperatureC!.Value).ToList();

        return new FieldWeatherDto
        {
            FieldId = field.Id,
            Stale = stale,
            LastUpdatedAt = cache.FetchedAt,
            Current = current == null ? null : new CurrentWeatherDto
            {
                TemperatureC = current.TemperatureC ?? 0,
                ApparentTemperatureC = current.ApparentTemperatureC ?? current.TemperatureC ?? 0,
                HumidityPercent = current.HumidityPercent ?? 0,
                WindSpeedKmh = current.WindSpeedKmh ?? 0,
                WindGustKmh = current.WindGustKmh ?? 0,
                PrecipitationMm = current.PrecipitationMm ?? 0,
                WeatherCode = current.WeatherCode ?? 0,
                Description = WeatherCodeToDescription(current.WeatherCode ?? 0),
                HighC = dailyTemps.Count > 0 ? dailyTemps.Max() : current.TemperatureC ?? 0,
                LowC = dailyTemps.Count > 0 ? dailyTemps.Min() : current.TemperatureC ?? 0
            },
            Rain = rain,
            Wind = wind,
            Frost = frost,
            Evapotranspiration = new EvapotranspirationDto { TodayMm = et0Today, Last7DaysMm = et07d },
            WaterBalance = BuildWaterBalance(rain.Previous7dMm, et07d, irrigationMm),
            Metadata = BuildMetadata(cache.Provider, cache.FetchedAt)
        };
    }

    public async Task<FieldDailyWeatherSnapshot?> CreateDailySnapshotAsync(Field field, DateOnly date, CancellationToken cancellationToken = default)
    {
        var existing = await _snapshotRepository.GetByFieldAndDateAsync(field.Id, date, cancellationToken);
        if (existing != null) return existing;

        var (lat, lng) = ResolveCoordinates(field);
        var cache = await _weatherCacheRepository.GetByGridKeyAsync(ComputeGridKey(lat, lng), cancellationToken)
                    ?? await RefreshLocationAsync(lat, lng, cancellationToken);

        var dayEntries = cache.HourlyForecast.Where(h => DateOnly.FromDateTime(h.Time) == date).ToList();
        if (dayEntries.Count == 0)
        {
            // The provider window does not cover this day; a snapshot of zeroes would be worse than none.
            _logger.LogDebug("No forecast hours for field {FieldId} on {Date}; skipping snapshot", field.Id, date);
            return null;
        }

        var snapshot = new FieldDailyWeatherSnapshot
        {
            Id = $"{field.Id}_{date:yyyyMMdd}",
            FieldId = field.Id,
            Date = date,
            MinTemperatureC = dayEntries.Min(h => h.TemperatureC),
            MaxTemperatureC = dayEntries.Max(h => h.TemperatureC),
            AverageTemperatureC = dayEntries.Count > 0 ? dayEntries.Average(h => h.TemperatureC) : null,
            MinHumidityPercent = dayEntries.Min(h => h.HumidityPercent),
            MaxHumidityPercent = dayEntries.Max(h => h.HumidityPercent),
            AverageHumidityPercent = dayEntries.Count > 0 ? dayEntries.Average(h => h.HumidityPercent) : null,
            RainTotalMm = dayEntries.Sum(h => h.RainMm ?? h.PrecipitationMm ?? 0),
            MaximumWindSpeedKmh = dayEntries.Max(h => h.WindSpeedKmh),
            MaximumWindGustKmh = dayEntries.Max(h => h.WindGustKmh),
            Et0Mm = dayEntries.Sum(h => h.Et0Mm ?? 0),
            SolarRadiationWm2 = dayEntries.Count > 0 ? dayEntries.Average(h => h.SolarRadiationWm2) : null,
            Provider = cache.Provider,
            Model = cache.Model,
            SourceResolution = SourceResolution,
            AverageWindSpeedKmh = dayEntries.Average(h => h.WindSpeedKmh),
            CreatedAt = _dateTimeProvider.UtcNow,
            UpdatedAt = _dateTimeProvider.UtcNow
        };
        return await _snapshotRepository.UpsertAsync(snapshot, cancellationToken);
    }

    public async Task<int> BackfillHistoryAsync(Field field, CancellationToken cancellationToken = default)
    {
        var years = _options.Weather.HistoryYears;
        if (years <= 0)
        {
            return 0;
        }

        var end = DateOnly.FromDateTime(_dateTimeProvider.UtcNow.AddDays(-_options.Weather.ArchiveLagDays));
        var start = end.AddYears(-years);
        if (end < start)
        {
            return 0;
        }

        var (lat, lng) = ResolveCoordinates(field);
        var archive = await _weatherProvider.FetchArchiveDailyAsync(lat, lng, start, end, cancellationToken);
        if (archive.Days.Count == 0)
        {
            return 0;
        }

        var existing = await _snapshotRepository.GetHistoryAsync(field.Id, start, end, cancellationToken);
        var existingDates = existing.Select(s => s.Date).ToHashSet();
        var now = _dateTimeProvider.UtcNow;

        var snapshots = archive.Days
            .Where(day => !existingDates.Contains(day.Date))
            .Select(day => new FieldDailyWeatherSnapshot
            {
                Id = $"{field.Id}_{day.Date:yyyyMMdd}",
                FieldId = field.Id,
                Date = day.Date,
                MinTemperatureC = day.MinTemperatureC,
                MaxTemperatureC = day.MaxTemperatureC,
                AverageTemperatureC = day.AverageTemperatureC,
                RainTotalMm = day.RainTotalMm,
                Et0Mm = day.Et0Mm,
                MaximumWindSpeedKmh = day.MaximumWindSpeedKmh,
                AverageWindSpeedKmh = day.AverageWindSpeedKmh,
                MaximumWindGustKmh = day.MaximumWindGustKmh,
                SolarRadiationWm2 = day.SolarRadiationWm2,
                Provider = archive.Provider,
                Model = archive.Model,
                SourceResolution = SourceResolution,
                CreatedAt = now,
                UpdatedAt = now
            })
            .ToList();

        if (snapshots.Count == 0)
        {
            return 0;
        }

        var written = await _snapshotRepository.UpsertManyAsync(snapshots, cancellationToken);
        _logger.LogInformation(
            "Backfilled {Count} daily weather snapshots for field {FieldId} ({From}–{To})",
            written, field.Id, start, end);
        return written;
    }

    /// <summary>
    /// Water applied over the balance window. Executions do not record volume, so each
    /// active irrigation completion counts as a configured nominal amount.
    /// </summary>
    private async Task<double> GetIrrigationMmAsync(string fieldId, DateTime windowStart, CancellationToken ct)
    {
        var tasks = await _fieldTasks.QueryAsync(new FieldTaskQuery { FieldId = fieldId }, ct);
        var irrigationTaskIds = tasks
            .Where(t => IsIrrigationTask(t))
            .Select(t => t.Id)
            .ToHashSet(StringComparer.Ordinal);

        if (irrigationTaskIds.Count == 0)
        {
            return 0;
        }

        var executions = await _executions.GetByFieldIdAsync(fieldId, ct);
        var count = executions.Count(e =>
            e.IsActive &&
            irrigationTaskIds.Contains(e.TaskId) &&
            e.CompletedAt >= windowStart);
        return count * _options.Weather.IrrigationMmPerTask;
    }

    private static bool IsIrrigationTask(Core.Entities.FieldWork.FieldTask task) =>
        ContainsIgnoreCase(task.TemplateCode, "irrig") ||
        ContainsIgnoreCase(task.Title, "irrig") ||
        ContainsIgnoreCase(task.Title, "άρδευ") ||
        ContainsIgnoreCase(task.Title, "αρδευ");

    private static bool ContainsIgnoreCase(string? value, string fragment) =>
        !string.IsNullOrWhiteSpace(value) && value.Contains(fragment, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Simple 7-day water balance: what came in (rain plus irrigation) against
    /// reference evapotranspiration. Indicative only — not a full soil model.
    /// </summary>
    private static WaterBalanceDto BuildWaterBalance(double rainMm, double et0Mm, double irrigationMm)
    {
        var balance = rainMm + irrigationMm - et0Mm;
        string label;
        if (balance <= -20) label = "Dry";
        else if (balance < 0) label = "Slightly dry";
        else if (balance <= 20) label = "Balanced";
        else label = "Wet";

        return new WaterBalanceDto
        {
            RainMm = Math.Round(rainMm, 1),
            Et0Mm = Math.Round(et0Mm, 1),
            IrrigationMm = Math.Round(irrigationMm, 1),
            BalanceMm = Math.Round(balance, 1),
            Label = label
        };
    }

    internal static DataSourceMetadataDto BuildMetadata(string provider, DateTime fetchedAt) => new()
    {
        Source = provider,
        SourceUrl = "https://open-meteo.com",
        Attribution = "Weather data by Open-Meteo.com",
        Licence = "CC BY 4.0",
        SpatialResolution = SourceResolution,
        TemporalResolution = "hourly",
        ValueType = "modelled",
        LastUpdatedAt = fetchedAt
    };

    private FrostRiskDto ComputeFrostRisk(List<HourlyForecastEntry> hourly, DateTime now)
    {
        var nextNight = hourly.Where(h => h.Time >= now && h.Time <= now.AddHours(18)).ToList();
        var minTemp = nextNight.Count > 0 ? nextNight.Min(h => h.TemperatureC) ?? 10 : 10;
        var minHour = nextNight.FirstOrDefault(h => h.TemperatureC == minTemp);
        var opts = _options.FrostRisk;
        string level;
        if (minTemp <= opts.CriticalTempC) level = "Critical";
        else if (minTemp <= opts.HighTempC) level = "High";
        else if (minTemp <= opts.ModerateTempC) level = "Moderate";
        else if (minTemp <= opts.LowTempC) level = "Low";
        else level = "None";
        return new FrostRiskDto
        {
            Level = level,
            Window = minHour != null && level != "None" ? $"{minHour.Time.AddHours(-1):HH:mm}–{minHour.Time.AddHours(2):HH:mm}" : null,
            ForecastMinTempC = minTemp,
            WeatherSourceResolution = SourceResolution,
            TerrainResolution = "30 m",
            Confidence = "Medium"
        };
    }

    private static RainIntelligenceDto ComputeRainIntelligence(List<HourlyForecastEntry> past, List<HourlyForecastEntry> forecast, DateTime now)
    {
        double SumPast(TimeSpan span) => past.Where(h => h.Time > now - span).Sum(h => h.RainMm ?? h.PrecipitationMm ?? 0);
        double SumForecast(TimeSpan span) => forecast.Where(h => h.Time <= now + span).Sum(h => h.RainMm ?? h.PrecipitationMm ?? 0);
        return new RainIntelligenceDto
        {
            Previous1hMm = SumPast(TimeSpan.FromHours(1)),
            Previous6hMm = SumPast(TimeSpan.FromHours(6)),
            Previous12hMm = SumPast(TimeSpan.FromHours(12)),
            Previous24hMm = SumPast(TimeSpan.FromHours(24)),
            Previous48hMm = SumPast(TimeSpan.FromHours(48)),
            Previous7dMm = SumPast(TimeSpan.FromDays(7)),
            Forecast3hMm = SumForecast(TimeSpan.FromHours(3)),
            Forecast6hMm = SumForecast(TimeSpan.FromHours(6)),
            Forecast12hMm = SumForecast(TimeSpan.FromHours(12)),
            Forecast24hMm = SumForecast(TimeSpan.FromHours(24)),
            Forecast48hMm = SumForecast(TimeSpan.FromHours(48)),
            Forecast72hMm = SumForecast(TimeSpan.FromHours(72)),
            Forecast7dMm = SumForecast(TimeSpan.FromDays(7))
        };
    }

    private static WindIntelligenceDto ComputeWindIntelligence(List<HourlyForecastEntry> hourly, DateTime now)
    {
        var current = hourly.LastOrDefault(h => h.Time <= now);
        var next6 = hourly.Where(h => h.Time > now && h.Time <= now.AddHours(6)).ToList();
        var next12 = hourly.Where(h => h.Time > now && h.Time <= now.AddHours(12)).ToList();
        var next24 = hourly.Where(h => h.Time > now && h.Time <= now.AddHours(24)).ToList();
        var next72 = hourly.Where(h => h.Time > now && h.Time <= now.AddHours(72)).ToList();
        var next7d = hourly.Where(h => h.Time > now && h.Time <= now.AddDays(7)).ToList();
        var dirs = next24.Where(h => h.WindDirectionDegrees.HasValue).Select(h => h.WindDirectionDegrees!.Value).ToList();
        return new WindIntelligenceDto
        {
            CurrentSpeedKmh = current?.WindSpeedKmh ?? 0,
            CurrentGustKmh = current?.WindGustKmh ?? 0,
            MaxNext6hKmh = next6.Count > 0 ? next6.Max(h => h.WindGustKmh ?? h.WindSpeedKmh ?? 0) : 0,
            MaxNext12hKmh = next12.Count > 0 ? next12.Max(h => h.WindGustKmh ?? h.WindSpeedKmh ?? 0) : 0,
            MaxNext24hKmh = next24.Count > 0 ? next24.Max(h => h.WindGustKmh ?? h.WindSpeedKmh ?? 0) : 0,
            MaxNext72hKmh = next72.Count > 0 ? next72.Max(h => h.WindGustKmh ?? h.WindSpeedKmh ?? 0) : 0,
            MaxNext7dKmh = next7d.Count > 0 ? next7d.Max(h => h.WindGustKmh ?? h.WindSpeedKmh ?? 0) : 0,
            DominantDirection = dirs.Count > 0 ? DegreesToCompass(dirs.Average()) : null
        };
    }

    private static (double lat, double lng) ResolveCoordinates(Field field)
    {
        if (field.CenterPoint?.Coordinates is { Count: >= 2 })
            return (field.CenterPoint.Coordinates[1], field.CenterPoint.Coordinates[0]);
        if (field.Location != null)
            return (field.Location.Latitude, field.Location.Longitude);
        throw new InvalidOperationException("Field has no coordinates");
    }

    private static string WeatherCodeToDescription(int code) => code switch
    {
        0 => "Clear sky",
        <= 3 => "Partly cloudy",
        <= 48 => "Cloudy",
        <= 67 => "Rain",
        <= 77 => "Snow",
        <= 82 => "Rain showers",
        <= 86 => "Snow showers",
        >= 95 => "Thunderstorm",
        _ => "Cloudy"
    };

    private static string DegreesToCompass(double degrees)
    {
        var dirs = new[] { "N", "NE", "E", "SE", "S", "SW", "W", "NW" };
        return dirs[(int)Math.Round(degrees / 45) % 8];
    }
}
