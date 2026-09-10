using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using OliveLifecycle.Core.Time;
using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Application.Services;

public interface IFieldWorkEventSignalCollector
{
    Task<FieldWorkEventSignals> CollectAsync(
        string fieldId,
        FieldPhenologySnapshot phenology,
        IReadOnlyList<OfficialAgriculturalWarning> warnings,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Builds event evidence for proposal evaluation from weather, alerts, warnings, and recent completions.
/// </summary>
public class FieldWorkEventSignalCollector : IFieldWorkEventSignalCollector
{
    private readonly IFieldSpatialProfileRepository _profiles;
    private readonly IFieldDailyWeatherSnapshotRepository _dailyWeather;
    private readonly IFieldEnvironmentalAlertRepository _alerts;
    private readonly ITaskExecutionRepository _executions;
    private readonly IFieldTaskRepository _tasks;
    private readonly IDateTimeProvider _clock;
    private readonly FieldWorkEventThresholds _thresholds;
    private readonly double _vegetationDropPercent;

    public FieldWorkEventSignalCollector(
        IFieldSpatialProfileRepository profiles,
        IFieldDailyWeatherSnapshotRepository dailyWeather,
        IFieldEnvironmentalAlertRepository alerts,
        ITaskExecutionRepository executions,
        IFieldTaskRepository tasks,
        IDateTimeProvider clock,
        IOptions<GeospatialOptions> geospatialOptions)
    {
        _profiles = profiles;
        _dailyWeather = dailyWeather;
        _alerts = alerts;
        _executions = executions;
        _tasks = tasks;
        _clock = clock;
        var options = geospatialOptions.Value;
        _thresholds = MapThresholds(options.FieldWorkEvents);
        _vegetationDropPercent = options.Alerts.VegetationDropPercent;
    }

    public async Task<FieldWorkEventSignals> CollectAsync(
        string fieldId,
        FieldPhenologySnapshot phenology,
        IReadOnlyList<OfficialAgriculturalWarning> warnings,
        CancellationToken cancellationToken = default)
    {
        var now = _clock.UtcNow;
        var profile = await _profiles.GetByFieldIdAsync(fieldId, cancellationToken);
        var weather = profile?.LatestWeatherSummary;

        var today = AthensTime.CalendarDate(now);
        var from = today.AddDays(-3);
        var history = await _dailyWeather.GetHistoryAsync(fieldId, from, today, cancellationToken);
        var recentRain = history.Sum(d => d.RainTotalMm ?? 0);
        var maxGust = history.Select(d => d.MaximumWindGustKmh ?? 0).DefaultIfEmpty(0).Max();
        var humidityValues = history
            .Select(d => d.AverageHumidityPercent ?? d.MaxHumidityPercent)
            .Where(h => h.HasValue)
            .Select(h => h!.Value)
            .ToList();
        double? humidity = humidityValues.Count > 0 ? humidityValues.Average() : null;

        var activeAlerts = await _alerts.GetActiveByFieldIdAsync(fieldId, cancellationToken);
        var lookbackHours = Math.Max(_thresholds.TreatmentRainLookbackHours, _thresholds.FertiliserRainLookbackHours);
        var executions = (await _executions.GetByFieldIdAsync(fieldId, cancellationToken))
            .Where(e => e.IsActive && e.CompletedAt >= now.AddHours(-lookbackHours))
            .OrderByDescending(e => e.CompletedAt)
            .ToList();

        var recent = new List<FieldWorkRecentExecutionSignal>();
        foreach (var execution in executions)
        {
            var task = await _tasks.GetByIdAsync(execution.TaskId, cancellationToken);
            var code = task?.TemplateCode;
            if (string.IsNullOrWhiteSpace(code))
            {
                continue;
            }

            var entry = FieldWorkCatalogue.GetByCode(code) ?? FieldWorkEventCatalogue.GetByCode(code);
            var isFertilisation = string.Equals(code, "T05", StringComparison.OrdinalIgnoreCase)
                || string.Equals(entry?.WeatherRuleProfile, "surface_fertilisation", StringComparison.OrdinalIgnoreCase);
            var isTreatment = entry?.IsPlantProtectionTreatment == true
                || string.Equals(entry?.WeatherRuleProfile, "spray", StringComparison.OrdinalIgnoreCase)
                || string.Equals(entry?.WeatherRuleProfile, "plant_protection", StringComparison.OrdinalIgnoreCase);

            if (!isFertilisation && !isTreatment)
            {
                continue;
            }

            recent.Add(new FieldWorkRecentExecutionSignal
            {
                TaskId = execution.TaskId,
                TemplateCode = code,
                CompletedAt = execution.CompletedAt,
                IsPlantProtectionTreatment = isTreatment,
                IsSurfaceFertilisation = isFertilisation,
                RainfastHours = _thresholds.PostTreatmentDefaultRainfastHours
            });
        }

        var input = new FieldWorkEventSignalInput
        {
            UtcNow = now,
            Phenology = phenology,
            ForecastMinTempC = weather?.ForecastMinTempC,
            ForecastMaxTempC = weather?.ForecastMaxTempC,
            FrostRiskLevel = weather?.FrostRiskLevel,
            RecentRainMm = recentRain > 0 ? recentRain : weather?.RainNext24hMm,
            MaxGustKmh = maxGust > 0 ? maxGust : weather?.WindSpeedKmh,
            HumidityPercent = humidity,
            HasActiveFrostAlert = activeAlerts.Any(a => a.AlertType == EnvironmentalAlertType.Frost),
            HasActiveHeatAlert = activeAlerts.Any(a => a.AlertType == EnvironmentalAlertType.Heat),
            HasActiveVegetationAlert = activeAlerts.Any(a => a.AlertType == EnvironmentalAlertType.VegetationChange)
                || IsSatelliteAnomaly(profile?.LatestSatelliteSummary),
            HasActiveStormOrSevereWeatherWarning = warnings.Any(IsStormWarning),
            HasPeacockOfficialWarning = warnings.Any(w => MatchesWarning(w, "peacock", "κυκλοκ", "E04")),
            HasAnthracnoseOfficialWarning = warnings.Any(w => MatchesWarning(w, "anthracnose", "ανθράκ", "E05")),
            RecentExecutions = recent,
            Thresholds = _thresholds
        };

        return FieldWorkEventSignalDetector.Detect(input);
    }

    private bool IsSatelliteAnomaly(SatelliteSummary? satellite)
    {
        if (satellite?.NdviChangePercent is not { } change)
        {
            return false;
        }

        return change <= -_vegetationDropPercent;
    }

    private static bool IsStormWarning(OfficialAgriculturalWarning warning)
    {
        var blob = $"{warning.Title} {warning.Message}".ToLowerInvariant();
        return blob.Contains("storm")
            || blob.Contains("hail")
            || blob.Contains("καταιγ")
            || blob.Contains("χαλάζ")
            || blob.Contains("ανεμοθ")
            || warning.TemplateCodes.Contains("E02", StringComparer.OrdinalIgnoreCase);
    }

    private static bool MatchesWarning(OfficialAgriculturalWarning warning, params string[] needles)
    {
        if (warning.TemplateCodes.Any(c => needles.Any(n =>
                string.Equals(c, n, StringComparison.OrdinalIgnoreCase))))
        {
            return true;
        }

        var blob = $"{warning.Title} {warning.Message}".ToLowerInvariant();
        return needles.Any(n => blob.Contains(n, StringComparison.OrdinalIgnoreCase));
    }

    private static FieldWorkEventThresholds MapThresholds(FieldWorkEventOptions options) => new()
    {
        FrostWarningTempC = options.FrostWarningTempC,
        FrostUrgentTempC = options.FrostUrgentTempC,
        StormGustKmh = options.StormGustKmh,
        StormHeavyRainMm = options.StormHeavyRainMm,
        HeatInfoTempC = options.HeatInfoTempC,
        HeatUrgentTempC = options.HeatUrgentTempC,
        PeacockCoolMaxTempC = options.PeacockCoolMaxTempC,
        PeacockHumidityPercent = options.PeacockHumidityPercent,
        PeacockRainMm = options.PeacockRainMm,
        AnthracnoseRainMm = options.AnthracnoseRainMm,
        AnthracnoseHumidityPercent = options.AnthracnoseHumidityPercent,
        PostTreatmentDefaultRainfastHours = options.PostTreatmentDefaultRainfastHours,
        PostTreatmentMinRainMm = options.PostTreatmentMinRainMm,
        FertiliserHeavyRainMm = options.FertiliserHeavyRainMm,
        FertiliserRainLookbackHours = options.FertiliserRainLookbackHours,
        TreatmentRainLookbackHours = options.TreatmentRainLookbackHours
    };
}
