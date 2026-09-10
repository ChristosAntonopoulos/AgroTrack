using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.DTOs.Geospatial;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Application.Services;

public interface IFieldTaskWeatherEvaluationService
{
    Task<TaskWeatherEvaluation?> EvaluateTaskAsync(
        FieldTask task,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task EvaluateFieldAsync(string fieldId, CancellationToken cancellationToken = default);

    Task EvaluateOpenTasksAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Loads forecast data, runs <see cref="WeatherSuitabilityEvaluator"/>, persists
/// <see cref="TaskWeatherEvaluation"/>, and updates FieldTask suitability only —
/// never planned dates.
/// </summary>
public class FieldTaskWeatherEvaluationService : IFieldTaskWeatherEvaluationService
{
    private static readonly FieldTaskStatus[] OpenStatuses =
    [
        FieldTaskStatus.Planned,
        FieldTaskStatus.Ready,
        FieldTaskStatus.InProgress,
        FieldTaskStatus.Blocked
    ];

    private readonly IFieldTaskRepository _tasks;
    private readonly ITaskWeatherEvaluationRepository _evaluations;
    private readonly IFieldRepository _fields;
    private readonly IFieldWorkTaskTemplateVersionRepository _versions;
    private readonly IWeatherIntelligenceService _weather;
    private readonly IDateTimeProvider _clock;
    private readonly TaskRulesOptions _rules;
    private readonly ILogger<FieldTaskWeatherEvaluationService> _logger;

    public FieldTaskWeatherEvaluationService(
        IFieldTaskRepository tasks,
        ITaskWeatherEvaluationRepository evaluations,
        IFieldRepository fields,
        IFieldWorkTaskTemplateVersionRepository versions,
        IWeatherIntelligenceService weather,
        IDateTimeProvider clock,
        IOptions<GeospatialOptions> options,
        ILogger<FieldTaskWeatherEvaluationService> logger)
    {
        _tasks = tasks;
        _evaluations = evaluations;
        _fields = fields;
        _versions = versions;
        _weather = weather;
        _clock = clock;
        _rules = options.Value.TaskRules;
        _logger = logger;
    }

    public async Task EvaluateOpenTasksAsync(CancellationToken cancellationToken = default)
    {
        var open = await _tasks.QueryAsync(
            new FieldTaskQuery { Statuses = OpenStatuses },
            cancellationToken);

        foreach (var group in open.GroupBy(t => t.FieldId))
        {
            await EvaluateFieldAsync(group.Key, cancellationToken);
        }
    }

    public async Task EvaluateFieldAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var open = await _tasks.QueryAsync(
            new FieldTaskQuery { FieldId = fieldId, Statuses = OpenStatuses },
            cancellationToken);

        foreach (var task in open)
        {
            try
            {
                await EvaluateTaskAsync(task, cancellationToken: cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Weather evaluation failed for FieldTask {TaskId}", task.Id);
            }
        }
    }

    public async Task<TaskWeatherEvaluation?> EvaluateTaskAsync(
        FieldTask task,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var field = await _fields.GetByIdAsync(task.FieldId, cancellationToken);
        if (field == null)
        {
            return null;
        }

        FieldWeatherDto? weather = null;
        try
        {
            weather = await _weather.GetFieldWeatherAsync(field, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Weather unavailable for field {FieldId}", field.Id);
        }

        var profile = await ResolveProfileAsync(task, cancellationToken);
        var requiresLabel = FieldWorkCatalogue.GetByCode(task.TemplateCode ?? string.Empty)?.IsPlantProtectionTreatment == true
            || WeatherSuitabilityEvaluator.ProfileRequiresProductLabel(profile);

        var now = _clock.UtcNow;
        var candidateStart = task.PlannedStart ?? now;
        var signals = WeatherWindowSignals.From(weather, candidateStart, now);
        var hasWeather = weather?.Current != null
            || (weather?.LastUpdatedAt != null)
            || !string.IsNullOrWhiteSpace(weather?.Metadata.Source);
        // Empty degraded payload (no provider cache) should not count as usable weather.
        if (weather is { Stale: true, LastUpdatedAt: null, Current: null })
        {
            hasWeather = false;
        }

        var input = new WeatherSuitabilityEvaluationInput
        {
            UtcNow = now,
            CandidateStart = candidateStart,
            HasWeatherData = hasWeather && weather != null,
            ForecastFetchedAt = weather?.LastUpdatedAt,
            WeatherRuleProfile = profile,
            RequiresProductLabel = requiresLabel,
            ProductLabel = task.ProductLabel,
            RainMmInWindow = signals.RainMm,
            MaxWindKmhInWindow = signals.MaxWindKmh,
            MaxGustKmhInWindow = signals.MaxGustKmh,
            HumidityPercent = weather?.Current?.HumidityPercent,
            MaxTempC = weather?.Current?.HighC,
            Thresholds = ToThresholds(_rules),
            Language = language
        };

        var result = WeatherSuitabilityEvaluator.Evaluate(input);

        var evaluation = new TaskWeatherEvaluation
        {
            TaskId = task.Id,
            ProposalId = task.ProposalId,
            FieldId = task.FieldId,
            TemplateCode = task.TemplateCode,
            CandidateDate = candidateStart,
            CandidateDuration = task.PlannedEnd.HasValue && task.PlannedStart.HasValue
                ? task.PlannedEnd - task.PlannedStart
                : null,
            Suitability = result.Suitability,
            Score = result.Score,
            Reasons = result.Reasons.ToList(),
            HardBlockers = result.HardBlockers.ToList(),
            WeatherSnapshotJson = weather == null
                ? null
                : JsonSerializer.Serialize(new
                {
                    weather.Stale,
                    weather.LastUpdatedAt,
                    signals.RainMm,
                    signals.MaxWindKmh,
                    signals.MaxGustKmh,
                    profile
                }),
            EvaluatedAt = now,
            ForecastHorizonHours = result.ForecastHorizonHours,
            SuggestedAlternativeDates = [],
            CreatedAt = now,
            UpdatedAt = now
        };

        var saved = await _evaluations.CreateAsync(evaluation, cancellationToken);

        // Suitability only — planned dates stay exactly as the user set them.
        task.WeatherSuitability = result.Suitability;
        task.WeatherEvaluationId = saved.Id;
        task.UpdatedAt = now;
        await _tasks.UpdateAsync(task, cancellationToken);

        return saved;
    }

    private async Task<string?> ResolveProfileAsync(FieldTask task, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(task.TemplateCode))
        {
            return InferProfileFromTitle(task.Title);
        }

        var catalogue = FieldWorkCatalogue.GetByCode(task.TemplateCode);
        if (!string.IsNullOrWhiteSpace(catalogue?.WeatherRuleProfile))
        {
            return catalogue.WeatherRuleProfile;
        }

        var version = task.TemplateVersion.HasValue
            ? await _versions.GetByCodeAndVersionAsync(task.TemplateCode, task.TemplateVersion.Value, cancellationToken)
            : await _versions.GetCurrentAsync(task.TemplateCode, cancellationToken);

        return version?.WeatherRuleProfile ?? InferProfileFromTitle(task.Title);
    }

    private static string InferProfileFromTitle(string? title)
    {
        if (string.IsNullOrWhiteSpace(title)) return "default";
        var t = title.ToLowerInvariant();
        if (t.Contains("ψεκασ") || t.Contains("spray") || t.Contains("φυτοπροστ")) return "spraying";
        if (t.Contains("άρδευ") || t.Contains("irrig")) return "irrigation";
        if (t.Contains("συγκομ") || t.Contains("harvest")) return "harvest";
        if (t.Contains("λίπαν") || t.Contains("fertil")) return "surface_fertilisation";
        return "default";
    }

    private static WeatherSuitabilityThresholds ToThresholds(TaskRulesOptions rules) => new()
    {
        SprayingMaxWindKmh = rules.SprayingMaxWindKmh,
        SprayingMaxGustKmh = rules.SprayingMaxGustKmh,
        SprayingMinHumidityPercent = rules.SprayingMinHumidityPercent,
        SprayingMaxHumidityPercent = rules.SprayingMaxHumidityPercent,
        IrrigationRainThresholdMm = rules.IrrigationRainThresholdMm,
        HarvestMaxWindKmh = rules.HarvestMaxWindKmh,
        HeatStressTempC = rules.HeatStressTempC
    };
}

/// <summary>Maps FieldWeatherDto aggregates onto the lead-time window for a candidate date.</summary>
public static class WeatherWindowSignals
{
    public readonly record struct Signals(double RainMm, double MaxWindKmh, double MaxGustKmh);

    public static Signals From(FieldWeatherDto? weather, DateTime candidateStart, DateTime utcNow)
    {
        if (weather == null)
        {
            return new Signals(0, 0, 0);
        }

        var lead = Math.Max(WeatherSuitabilityEvaluator.ComputeLeadHours(candidateStart, utcNow), 0);

        return lead switch
        {
            <= 3 => new Signals(weather.Rain.Forecast3hMm, weather.Wind.MaxNext6hKmh, weather.Wind.MaxNext6hKmh),
            <= 6 => new Signals(weather.Rain.Forecast6hMm, weather.Wind.MaxNext6hKmh, weather.Wind.MaxNext6hKmh),
            <= 12 => new Signals(weather.Rain.Forecast12hMm, weather.Wind.MaxNext12hKmh, weather.Wind.MaxNext12hKmh),
            <= 24 => new Signals(weather.Rain.Forecast24hMm, weather.Wind.MaxNext24hKmh, weather.Wind.MaxNext24hKmh),
            <= 48 => new Signals(weather.Rain.Forecast48hMm, weather.Wind.MaxNext24hKmh, weather.Wind.MaxNext24hKmh),
            <= 72 => new Signals(weather.Rain.Forecast72hMm, weather.Wind.MaxNext72hKmh, weather.Wind.MaxNext72hKmh),
            _ => new Signals(weather.Rain.Forecast7dMm, weather.Wind.MaxNext7dKmh, weather.Wind.MaxNext7dKmh)
        };
    }
}
