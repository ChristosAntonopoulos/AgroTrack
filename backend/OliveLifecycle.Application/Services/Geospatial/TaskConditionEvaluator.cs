using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.DTOs.Geospatial;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Services.Geospatial;

public interface ITaskConditionEvaluator
{
    Task EvaluateTaskAsync(TaskItem task, Field field, CancellationToken cancellationToken = default);

    /// <summary>
    /// Re-evaluates every upcoming task on a field after a weather refresh, and clears
    /// warnings whose condition no longer holds.
    /// </summary>
    Task EvaluateFieldWeatherChangeAsync(Field field, CancellationToken cancellationToken = default);
}

/// <summary>
/// Turns forecast weather into advisory warnings on individual tasks.
///
/// Warnings never block work: the grower decides. Each one names the condition, the
/// window it applies to, and carries a confidence level derived from the forecast lead
/// time so a two-day-out warning is not read as a certainty.
/// </summary>
public class TaskConditionEvaluator : ITaskConditionEvaluator
{
    /// <summary>Rain during or shortly before spraying washes off the treatment.</summary>
    private const double SprayingRainToleranceMm = 1;

    /// <summary>Above this, rain leaches surface-applied fertiliser before it is taken up.</summary>
    private const double FertiliserLeachingRainMm = 10;

    /// <summary>Rain on the ground makes harvest nets and fruit handling difficult.</summary>
    private const double HarvestRainCautionMm = 1;
    private const double HarvestRainPoorMm = 5;

    /// <summary>Rain after spraying that is heavy enough to question the treatment.</summary>
    private const double PostSprayingWashoffMm = 5;

    /// <summary>A condition this far past its threshold is reported as high severity.</summary>
    private const double HighSeverityFactor = 1.5;

    /// <summary>Tasks further out than this are not re-checked on a weather refresh.</summary>
    private static readonly TimeSpan UpcomingHorizon = TimeSpan.FromHours(TaskWeatherWindow.MaxLeadHours);

    private readonly IFieldEnvironmentalAlertRepository _alertRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IWeatherIntelligenceService _weatherService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly TaskRulesOptions _rules;
    private readonly ILogger<TaskConditionEvaluator> _logger;

    public TaskConditionEvaluator(
        IFieldEnvironmentalAlertRepository alertRepository,
        ITaskRepository taskRepository,
        IWeatherIntelligenceService weatherService,
        IDateTimeProvider dateTimeProvider,
        IOptions<GeospatialOptions> options,
        ILogger<TaskConditionEvaluator> logger)
    {
        _alertRepository = alertRepository;
        _taskRepository = taskRepository;
        _weatherService = weatherService;
        _dateTimeProvider = dateTimeProvider;
        _rules = options.Value.TaskRules;
        _logger = logger;
    }

    public async Task EvaluateTaskAsync(TaskItem task, Field field, CancellationToken cancellationToken = default)
    {
        var weather = await TryGetWeatherAsync(field, cancellationToken);
        if (weather == null) return;

        var warnings = Evaluate(task, weather);
        await PersistAsync(field.Id, warnings, cancellationToken);
    }

    public async Task EvaluateFieldWeatherChangeAsync(Field field, CancellationToken cancellationToken = default)
    {
        var weather = await TryGetWeatherAsync(field, cancellationToken);
        if (weather == null) return;

        var now = _dateTimeProvider.UtcNow;
        var tasks = (await _taskRepository.GetByFieldIdAsync(field.Id, cancellationToken))
            .Where(t => IsUpcoming(t, now))
            .ToList();

        var warnings = tasks.SelectMany(task => Evaluate(task, weather)).ToList();
        await PersistAsync(field.Id, warnings, cancellationToken);

        // Anything previously raised that no longer applies is withdrawn, so an
        // improving forecast visibly clears the banner instead of lingering.
        var expected = warnings.Select(w => w.DedupKey).ToHashSet(StringComparer.Ordinal);
        var stale = (await _alertRepository.GetActiveByFieldIdAsync(field.Id, cancellationToken))
            .Where(alert => alert.AlertType == EnvironmentalAlertType.TaskWarning)
            .Where(alert => !expected.Contains(alert.DedupKey))
            .ToList();

        foreach (var alert in stale)
        {
            await _alertRepository.DeactivateAsync(alert.Id, cancellationToken);
        }

        _logger.LogDebug(
            "Weather change evaluation for field {FieldId}: {Tasks} upcoming tasks, {Raised} warnings, {Cleared} cleared",
            field.Id, tasks.Count, warnings.Count, stale.Count);
    }

    private async Task<FieldWeatherDto?> TryGetWeatherAsync(Field field, CancellationToken cancellationToken)
    {
        try
        {
            return await _weatherService.GetFieldWeatherAsync(field, cancellationToken);
        }
        catch (Exception ex)
        {
            // No forecast means no advice; the task itself is unaffected.
            _logger.LogWarning(ex, "Weather unavailable while evaluating tasks for field {FieldId}", field.Id);
            return null;
        }
    }

    private static bool IsUpcoming(TaskItem task, DateTime now)
    {
        if (task.Status is WorkTaskStatus.Completed or WorkTaskStatus.Cancelled) return false;
        if (task.ScheduledStart == null) return true;
        return task.ScheduledStart.Value <= now.Add(UpcomingHorizon);
    }

    /// <summary>
    /// Pure rule evaluation for one task, so the same logic serves a single task check
    /// and a whole-field refresh.
    /// </summary>
    private List<TaskWarning> Evaluate(TaskItem task, FieldWeatherDto weather)
    {
        var warnings = new List<TaskWarning>();
        var category = TaskWeatherClassifier.Classify(task.Type, task.Title);

        if (task.Status == WorkTaskStatus.Completed)
        {
            AddPostCompletionWarnings(task, weather, category, warnings);
            return warnings;
        }

        if (category == WeatherSensitiveTask.None) return warnings;

        var window = TaskWeatherWindow.For(weather, task.ScheduledStart, _dateTimeProvider.UtcNow);
        if (window == null) return warnings;

        switch (category)
        {
            case WeatherSensitiveTask.Spraying:
                AddSprayingWarnings(task, weather, window, warnings);
                break;
            case WeatherSensitiveTask.Irrigation:
                AddIrrigationWarnings(task, weather, window, warnings);
                break;
            case WeatherSensitiveTask.Fertilization:
                AddFertilizationWarnings(task, window, warnings);
                break;
            case WeatherSensitiveTask.Harvest:
                AddHarvestWarnings(task, weather, window, warnings);
                break;
        }

        return warnings;
    }

    private void AddSprayingWarnings(TaskItem task, FieldWeatherDto weather, TaskWeatherWindow window, List<TaskWarning> warnings)
    {
        const string Title = "Spraying conditions";

        if (window.MaxWindKmh > _rules.SprayingMaxWindKmh)
        {
            warnings.Add(Warning(task, "wind", Title, window,
                $"Wind up to {window.MaxWindKmh:F0} km/h is forecast for {window.Label}, above the {_rules.SprayingMaxWindKmh:F0} km/h spray drift guideline.",
                Severity(window.MaxWindKmh, _rules.SprayingMaxWindKmh)));
        }
        else if (weather.Wind.CurrentGustKmh > _rules.SprayingMaxGustKmh)
        {
            warnings.Add(Warning(task, "gust", Title, window,
                $"Gusts of {weather.Wind.CurrentGustKmh:F0} km/h are being reported, above the {_rules.SprayingMaxGustKmh:F0} km/h guideline.",
                Severity(weather.Wind.CurrentGustKmh, _rules.SprayingMaxGustKmh)));
        }

        if (window.RainMm > SprayingRainToleranceMm)
        {
            warnings.Add(Warning(task, "rain", Title, window,
                $"{window.RainMm:F1} mm of rain is forecast for {window.Label}, which may wash off the treatment.",
                Severity(window.RainMm, SprayingRainToleranceMm)));
        }

        var humidity = weather.Current?.HumidityPercent;
        if (humidity < _rules.SprayingMinHumidityPercent)
        {
            warnings.Add(Warning(task, "humidity", Title, window,
                $"Humidity is {humidity:F0}%, below the {_rules.SprayingMinHumidityPercent:F0}% guideline, so droplets may evaporate before reaching the canopy.",
                "medium"));
        }
        else if (humidity > _rules.SprayingMaxHumidityPercent)
        {
            warnings.Add(Warning(task, "humidity", Title, window,
                $"Humidity is {humidity:F0}%, above the {_rules.SprayingMaxHumidityPercent:F0}% guideline, so the spray may not dry on the leaf.",
                "medium"));
        }
    }

    private void AddIrrigationWarnings(TaskItem task, FieldWeatherDto weather, TaskWeatherWindow window, List<TaskWarning> warnings)
    {
        if (window.RainMm < _rules.IrrigationRainThresholdMm) return;

        var balance = weather.WaterBalance.BalanceMm;
        warnings.Add(Warning(task, "rain", "Irrigation review", window,
            $"{window.RainMm:F1} mm of rain is forecast for {window.Label}. " +
            $"The field's 7-day water balance is {balance:+0.0;-0.0} mm, so this irrigation may be reducible.",
            Severity(window.RainMm, _rules.IrrigationRainThresholdMm)));
    }

    private void AddFertilizationWarnings(TaskItem task, TaskWeatherWindow window, List<TaskWarning> warnings)
    {
        const string Title = "Fertilisation conditions";

        if (window.RainMm > FertiliserLeachingRainMm)
        {
            warnings.Add(Warning(task, "rain", Title, window,
                $"{window.RainMm:F1} mm of rain is forecast for {window.Label}, enough to leach surface-applied fertiliser before uptake.",
                Severity(window.RainMm, FertiliserLeachingRainMm)));
        }

        if (window.MaxWindKmh > _rules.SprayingMaxWindKmh)
        {
            warnings.Add(Warning(task, "wind", Title, window,
                $"Wind up to {window.MaxWindKmh:F0} km/h is forecast for {window.Label}, which will scatter granular and foliar applications.",
                Severity(window.MaxWindKmh, _rules.SprayingMaxWindKmh)));
        }
    }

    private void AddHarvestWarnings(TaskItem task, FieldWeatherDto weather, TaskWeatherWindow window, List<TaskWarning> warnings)
    {
        const string Title = "Harvest conditions";
        var temperature = weather.Current?.TemperatureC;

        var poor = window.RainMm > HarvestRainPoorMm
                   || window.MaxWindKmh > _rules.HarvestMaxWindKmh
                   || temperature >= _rules.HeatStressTempC;

        if (poor)
        {
            var reasons = new List<string>();
            if (window.RainMm > HarvestRainPoorMm) reasons.Add($"{window.RainMm:F1} mm rain");
            if (window.MaxWindKmh > _rules.HarvestMaxWindKmh) reasons.Add($"wind to {window.MaxWindKmh:F0} km/h");
            if (temperature >= _rules.HeatStressTempC) reasons.Add($"{temperature:F0}°C heat");

            warnings.Add(Warning(task, "conditions", Title, window,
                $"Poor harvest conditions for {window.Label}: {string.Join(", ", reasons)}.",
                "high"));
            return;
        }

        if (window.RainMm > HarvestRainCautionMm)
        {
            warnings.Add(Warning(task, "conditions", Title, window,
                $"{window.RainMm:F1} mm of rain is forecast for {window.Label}. Wet fruit and nets slow picking and can affect oil quality.",
                "medium"));
        }
    }

    private void AddPostCompletionWarnings(TaskItem task, FieldWeatherDto weather, WeatherSensitiveTask category, List<TaskWarning> warnings)
    {
        if (category != WeatherSensitiveTask.Spraying || !task.ActualEnd.HasValue) return;
        if (weather.Rain.Previous24hMm <= PostSprayingWashoffMm) return;

        // Only meaningful while the rain is still within the measured 24-hour window.
        if ((_dateTimeProvider.UtcNow - task.ActualEnd.Value).TotalHours > 24) return;

        warnings.Add(new TaskWarning(
            DedupKey: BuildDedupKey(task, "post-spray-rain"),
            TaskId: task.Id,
            Title: "Post-spraying review",
            Message: $"{weather.Rain.Previous24hMm:F1} mm of rain fell in the 24 hours after this spraying task. Review whether the treatment needs repeating.",
            Severity: "medium",
            Confidence: DataConfidenceLevel.High,
            ValidTo: _dateTimeProvider.UtcNow.AddDays(2)));
    }

    private TaskWarning Warning(
        TaskItem task,
        string reasonKey,
        string title,
        TaskWeatherWindow window,
        string message,
        string severity) => new(
            DedupKey: BuildDedupKey(task, reasonKey),
            TaskId: task.Id,
            Title: title,
            Message: message,
            Severity: severity,
            Confidence: window.Confidence,
            ValidTo: task.ScheduledEnd ?? _dateTimeProvider.UtcNow.AddDays(2));

    /// <summary>
    /// Keyed by task and reason rather than by day, so an updated forecast replaces the
    /// previous warning for the same condition instead of stacking a new one beside it.
    /// </summary>
    private static string BuildDedupKey(TaskItem task, string reasonKey) => $"task_{task.Id}_{reasonKey}";

    private static string Severity(double value, double threshold)
        => value >= threshold * HighSeverityFactor ? "high" : "medium";

    private async Task PersistAsync(string fieldId, IReadOnlyList<TaskWarning> warnings, CancellationToken cancellationToken)
    {
        var now = _dateTimeProvider.UtcNow;

        foreach (var warning in warnings)
        {
            var existing = await _alertRepository.GetByDedupKeyAsync(warning.DedupKey, cancellationToken);

            await _alertRepository.UpsertAsync(new FieldEnvironmentalAlert
            {
                Id = existing?.Id ?? Guid.NewGuid().ToString("N"),
                FieldId = fieldId,
                DedupKey = warning.DedupKey,
                AlertType = EnvironmentalAlertType.TaskWarning,
                Severity = warning.Severity,
                Title = warning.Title,
                Message = warning.Message,
                RelatedTaskId = warning.TaskId,
                ValidFrom = existing?.ValidFrom ?? now,
                ValidTo = warning.ValidTo,
                IsActive = true,
                Confidence = warning.Confidence,
                CreatedAt = existing?.CreatedAt ?? now,
                UpdatedAt = now
            }, cancellationToken);
        }
    }

    /// <summary>One advisory condition found on a task.</summary>
    private sealed record TaskWarning(
        string DedupKey,
        string TaskId,
        string Title,
        string Message,
        string Severity,
        DataConfidenceLevel Confidence,
        DateTime? ValidTo);
}
