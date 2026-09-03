using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Application.Services.Geospatial;

public interface IFieldEnvironmentalAlertEvaluator
{
    /// <summary>
    /// Raises the field-level alerts implied by a freshly built spatial profile, and
    /// withdraws any earlier ones whose condition has passed.
    /// </summary>
    Task EvaluateAsync(Field field, FieldSpatialProfile profile, CancellationToken cancellationToken = default);
}

/// <summary>
/// Derives frost, heat, fire-proximity and vegetation-anomaly alerts from a field's
/// spatial profile.
///
/// Every alert states the evidence behind it and carries a confidence level, because
/// all four come from modelled or coarse-resolution sources rather than measurements on
/// the plot. Dedup keys are scoped so a repeated refresh updates the existing alert
/// instead of stacking a near-identical one beside it.
/// </summary>
public class FieldEnvironmentalAlertEvaluator : IFieldEnvironmentalAlertEvaluator
{
    /// <summary>A fire this close is treated as an immediate, not advisory, concern.</summary>
    private const double CriticalFireDistanceKm = 5;

    /// <summary>Degrees above the heat threshold that escalate the advisory.</summary>
    private const double SevereHeatMarginC = 4;

    private readonly IFieldEnvironmentalAlertRepository _alertRepository;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly AlertOptions _options;
    private readonly ILogger<FieldEnvironmentalAlertEvaluator> _logger;

    public FieldEnvironmentalAlertEvaluator(
        IFieldEnvironmentalAlertRepository alertRepository,
        IDateTimeProvider dateTimeProvider,
        IOptions<GeospatialOptions> options,
        ILogger<FieldEnvironmentalAlertEvaluator> logger)
    {
        _alertRepository = alertRepository;
        _dateTimeProvider = dateTimeProvider;
        _options = options.Value.Alerts;
        _logger = logger;
    }

    public async Task EvaluateAsync(Field field, FieldSpatialProfile profile, CancellationToken cancellationToken = default)
    {
        await EvaluateFrostAsync(field, profile, cancellationToken);
        await EvaluateHeatAsync(field, profile, cancellationToken);
        await EvaluateFireProximityAsync(field, profile, cancellationToken);
        await EvaluateVegetationAsync(field, profile, cancellationToken);
    }

    private async Task EvaluateFrostAsync(Field field, FieldSpatialProfile profile, CancellationToken ct)
    {
        var frostLevel = profile.LatestWeatherSummary?.FrostRiskLevel;
        if (frostLevel is not ("High" or "Critical")) return;

        // One frost alert per field per day, so a repeated refresh cannot spam the farmer.
        var dedupKey = $"frost_{field.Id}_{_dateTimeProvider.UtcNow:yyyyMMdd}";
        if (await _alertRepository.GetByDedupKeyAsync(dedupKey, ct) != null) return;

        var minTemp = profile.LatestWeatherSummary?.ForecastMinTempC;
        var window = profile.LatestWeatherSummary?.FrostWindow;
        var message = $"Frost risk {frostLevel}." +
                      (minTemp.HasValue ? $" Forecast minimum {minTemp.Value:F1}°C." : string.Empty) +
                      (string.IsNullOrEmpty(window) ? string.Empty : $" Expected {window}.") +
                      $" Based on a modelled forecast at {WeatherIntelligenceService.SourceResolution} resolution.";

        await RaiseAsync(field.Id, dedupKey, EnvironmentalAlertType.Frost,
            frostLevel!.ToLowerInvariant(), "Frost risk", message,
            DataConfidenceLevel.Medium, _dateTimeProvider.UtcNow.AddDays(1), ct);
    }

    private async Task EvaluateHeatAsync(Field field, FieldSpatialProfile profile, CancellationToken ct)
    {
        var maxTemp = profile.LatestWeatherSummary?.ForecastMaxTempC;
        var dedupKey = $"heat_{field.Id}_{_dateTimeProvider.UtcNow:yyyyMMdd}";

        if (maxTemp == null || maxTemp < _options.HeatAlertTempC)
        {
            await WithdrawAsync(dedupKey, ct);
            return;
        }

        var severe = maxTemp >= _options.HeatAlertTempC + SevereHeatMarginC;
        var message = $"A high of {maxTemp.Value:F0}°C is forecast today, at or above the " +
                      $"{_options.HeatAlertTempC:F0}°C heat-stress threshold. Avoid spraying and " +
                      "midday field work, and check that irrigation covers the extra demand. " +
                      $"Based on a modelled forecast at {WeatherIntelligenceService.SourceResolution} resolution.";

        await RaiseAsync(field.Id, dedupKey, EnvironmentalAlertType.Heat,
            severe ? "high" : "medium", "Heat stress", message,
            DataConfidenceLevel.Medium, _dateTimeProvider.UtcNow.AddDays(1), ct);
    }

    private async Task EvaluateFireProximityAsync(Field field, FieldSpatialProfile profile, CancellationToken ct)
    {
        var fire = profile.EnvironmentalSummary?.ClosestFire;
        var dedupKey = $"fire_{field.Id}";

        if (fire == null || fire.DistanceKm > _options.FireProximityKm)
        {
            await WithdrawAsync(dedupKey, ct);
            return;
        }

        var direction = string.IsNullOrEmpty(fire.Direction) ? string.Empty : $" to the {fire.Direction}";
        var message = $"A satellite fire detection {fire.DistanceKm:F1} km{direction} of this field was " +
                      $"recorded at {fire.DetectedAt:yyyy-MM-dd HH:mm} UTC" +
                      (string.IsNullOrEmpty(fire.Confidence) ? string.Empty : $" ({fire.Confidence.ToLowerInvariant()} confidence)") +
                      ". NASA FIRMS thermal detections are approximate and are not a substitute " +
                      "for official civil protection guidance.";

        await RaiseAsync(field.Id, dedupKey, EnvironmentalAlertType.FireProximity,
            fire.DistanceKm <= CriticalFireDistanceKm ? "critical" : "high",
            "Active fire nearby", message,
            // A single thermal pixel can be a flare or hot roof, so confidence follows FIRMS.
            string.Equals(fire.Confidence, "high", StringComparison.OrdinalIgnoreCase)
                ? DataConfidenceLevel.High
                : DataConfidenceLevel.Medium,
            fire.DetectedAt.AddHours(24), ct);
    }

    private async Task EvaluateVegetationAsync(Field field, FieldSpatialProfile profile, CancellationToken ct)
    {
        var satellite = profile.LatestSatelliteSummary;
        var dedupKey = $"vegetation_{field.Id}";

        if (!IsVegetationAnomaly(satellite))
        {
            await WithdrawAsync(dedupKey, ct);
            return;
        }

        var drop = Math.Abs(satellite!.NdviChangePercent!.Value);
        var affectedArea = satellite.AreaBelowBaselinePercent;
        var comparison = satellite.ComparedToObservationDate.HasValue
            ? $" compared with {satellite.ComparedToObservationDate.Value:yyyy-MM-dd}"
            : string.Empty;

        var message = $"NDVI on {satellite.ObservationDate:yyyy-MM-dd} is {drop:F0}% lower than this " +
                      $"field's own baseline{comparison}" +
                      (affectedArea.HasValue ? $", across {affectedArea.Value:F0}% of the field" : string.Empty) +
                      ". Vegetation indices show change, not its cause: check for water stress, " +
                      "pest damage, pruning or recent harvest before acting.";

        await RaiseAsync(field.Id, dedupKey, EnvironmentalAlertType.VegetationChange,
            drop >= _options.VegetationDropPercent * 2 ? "high" : "medium",
            "Vegetation change detected", message,
            // Confidence tracks how much of the field the satellite could actually see.
            satellite.UsablePixelPercent >= 80 ? DataConfidenceLevel.High : DataConfidenceLevel.Medium,
            _dateTimeProvider.UtcNow.AddDays(_options.VegetationMaxObservationAgeDays), ct);
    }

    /// <summary>
    /// A drop only counts when it is large, covers a meaningful share of the field, and
    /// comes from a recent observation. Anything else is noise or stale history.
    /// </summary>
    private bool IsVegetationAnomaly(SatelliteSummary? satellite)
    {
        if (satellite?.NdviChangePercent is not { } change || change > -_options.VegetationDropPercent) return false;
        if (satellite.ObservationDate is not { } observedAt) return false;

        var ageDays = (_dateTimeProvider.UtcNow - observedAt).TotalDays;
        if (ageDays > _options.VegetationMaxObservationAgeDays) return false;

        return satellite.AreaBelowBaselinePercent is null
               || satellite.AreaBelowBaselinePercent >= _options.VegetationDeclineAreaPercent;
    }

    private async Task RaiseAsync(
        string fieldId,
        string dedupKey,
        EnvironmentalAlertType type,
        string severity,
        string title,
        string message,
        DataConfidenceLevel confidence,
        DateTime? validTo,
        CancellationToken ct)
    {
        var existing = await _alertRepository.GetByDedupKeyAsync(dedupKey, ct);
        var now = _dateTimeProvider.UtcNow;

        await _alertRepository.UpsertAsync(new FieldEnvironmentalAlert
        {
            Id = existing?.Id ?? Guid.NewGuid().ToString("N"),
            FieldId = fieldId,
            DedupKey = dedupKey,
            AlertType = type,
            Severity = severity,
            Title = title,
            Message = message,
            ValidFrom = existing?.ValidFrom ?? now,
            ValidTo = validTo,
            IsActive = true,
            Confidence = confidence,
            CreatedAt = existing?.CreatedAt ?? now,
            UpdatedAt = now
        }, ct);

        _logger.LogInformation("Raised {AlertType} alert for field {FieldId} ({Severity})", type, fieldId, severity);
    }

    private async Task WithdrawAsync(string dedupKey, CancellationToken ct)
    {
        var existing = await _alertRepository.GetByDedupKeyAsync(dedupKey, ct);
        if (existing is not { IsActive: true }) return;

        await _alertRepository.DeactivateAsync(existing.Id, ct);
        _logger.LogInformation("Withdrew {AlertType} alert for field {FieldId}", existing.AlertType, existing.FieldId);
    }
}
