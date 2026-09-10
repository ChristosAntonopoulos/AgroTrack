using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Core.FieldWork;

/// <summary>Configurable planning defaults for event-triggered proposals — not legal or spray limits.</summary>
public sealed class FieldWorkEventThresholds
{
    public double FrostWarningTempC { get; init; } = 2;
    public double FrostUrgentTempC { get; init; } = 0;
    public double StormGustKmh { get; init; } = 70;
    public double StormHeavyRainMm { get; init; } = 20;
    public double HeatInfoTempC { get; init; } = 35;
    public double HeatUrgentTempC { get; init; } = 38;
    public double PeacockCoolMaxTempC { get; init; } = 22;
    public double PeacockHumidityPercent { get; init; } = 80;
    public double PeacockRainMm { get; init; } = 5;
    public double AnthracnoseRainMm { get; init; } = 8;
    public double AnthracnoseHumidityPercent { get; init; } = 85;
    public double PostTreatmentDefaultRainfastHours { get; init; } = 6;
    public double PostTreatmentMinRainMm { get; init; } = 1;
    public double FertiliserHeavyRainMm { get; init; } = 10;
    public int FertiliserRainLookbackHours { get; init; } = 48;
    public int TreatmentRainLookbackHours { get; init; } = 72;
}

public sealed class FieldWorkRecentExecutionSignal
{
    public required string TaskId { get; init; }
    public required string TemplateCode { get; init; }
    public DateTime CompletedAt { get; init; }
    public bool IsPlantProtectionTreatment { get; init; }
    public bool IsSurfaceFertilisation { get; init; }
    public double? RainfastHours { get; init; }
}

public sealed record FieldWorkEventSignalInput
{
    public required DateTime UtcNow { get; init; }
    public required FieldPhenologySnapshot Phenology { get; init; }
    public double? ForecastMinTempC { get; init; }
    public double? ForecastMaxTempC { get; init; }
    public string? FrostRiskLevel { get; init; }
    public double? RecentRainMm { get; init; }
    public double? MaxGustKmh { get; init; }
    public double? HumidityPercent { get; init; }
    public bool HasActiveFrostAlert { get; init; }
    public bool HasActiveHeatAlert { get; init; }
    public bool HasActiveVegetationAlert { get; init; }
    public bool HasActiveStormOrSevereWeatherWarning { get; init; }
    public bool HasPeacockOfficialWarning { get; init; }
    public bool HasAnthracnoseOfficialWarning { get; init; }
    public IReadOnlyList<FieldWorkRecentExecutionSignal> RecentExecutions { get; init; } = [];
    public FieldWorkEventThresholds Thresholds { get; init; } = new();
}

public sealed class FieldWorkEventSignals
{
    public bool FrostInspectionDue { get; init; }
    public bool FrostUrgent { get; init; }
    public double? ForecastMinTempC { get; init; }

    public bool StormInspectionDue { get; init; }
    public double? MaxGustKmh { get; init; }
    public double? StormRainMm { get; init; }

    public bool HeatInspectionDue { get; init; }
    public bool HeatUrgent { get; init; }
    public double? ForecastMaxTempC { get; init; }

    public bool PeacockSpotRiskReviewDue { get; init; }
    public bool AnthracnoseRiskReviewDue { get; init; }

    public bool PostTreatmentRainReviewDue { get; init; }
    public double? PostTreatmentRainMm { get; init; }
    public double? HoursBetweenTreatmentAndRain { get; init; }
    public string? PostTreatmentTaskId { get; init; }

    public bool FertiliserHeavyRainReviewDue { get; init; }
    public double? FertiliserRainMm { get; init; }
    public double? HoursBetweenFertilisationAndRain { get; init; }
    public string? FertiliserTaskId { get; init; }

    public bool SatelliteAnomalyReviewDue { get; init; }

    public bool IsActive(FieldWorkEventKind kind) => kind switch
    {
        FieldWorkEventKind.FrostInspection => FrostInspectionDue,
        FieldWorkEventKind.StormInspection => StormInspectionDue,
        FieldWorkEventKind.HeatInspection => HeatInspectionDue,
        FieldWorkEventKind.PeacockSpotRiskReview => PeacockSpotRiskReviewDue,
        FieldWorkEventKind.AnthracnoseRiskReview => AnthracnoseRiskReviewDue,
        FieldWorkEventKind.PostTreatmentRainReview => PostTreatmentRainReviewDue,
        FieldWorkEventKind.FertiliserHeavyRainReview => FertiliserHeavyRainReviewDue,
        FieldWorkEventKind.SatelliteAnomalyReview => SatelliteAnomalyReviewDue,
        _ => false
    };
}

/// <summary>Pure detector for event-triggered proposal evidence.</summary>
public static class FieldWorkEventSignalDetector
{
    public static FieldWorkEventSignals Detect(FieldWorkEventSignalInput input)
    {
        var t = input.Thresholds;
        var minTemp = input.ForecastMinTempC;
        var frostUrgent = minTemp is <= 0 || string.Equals(input.FrostRiskLevel, "Critical", StringComparison.OrdinalIgnoreCase);
        var frostDue = frostUrgent
            || input.HasActiveFrostAlert
            || minTemp is { } mt && mt <= t.FrostWarningTempC
            || string.Equals(input.FrostRiskLevel, "High", StringComparison.OrdinalIgnoreCase);

        var stormDue = input.HasActiveStormOrSevereWeatherWarning
            || (input.MaxGustKmh is { } gust && gust >= t.StormGustKmh)
            || (input.RecentRainMm is { } rain && rain >= t.StormHeavyRainMm);

        var maxTemp = input.ForecastMaxTempC;
        var heatUrgent = maxTemp is { } hot && hot >= t.HeatUrgentTempC;
        var heatDue = heatUrgent
            || input.HasActiveHeatAlert
            || (maxTemp is { } warm && warm >= t.HeatInfoTempC);

        var athens = AthensTime.CalendarDate(input.UtcNow);
        var peacockSeason = IsPeacockSeason(athens.Month);
        var peacockWeather = (input.RecentRainMm is { } pr && pr >= t.PeacockRainMm)
            || (input.HumidityPercent is { } ph && ph >= t.PeacockHumidityPercent
                && maxTemp is { } cool && cool <= t.PeacockCoolMaxTempC);
        var peacockDue = input.HasPeacockOfficialWarning
            || (peacockSeason && peacockWeather);

        var anthracnoseStage = BbchGate.Allows(
            new BbchRange { MinCode = 80, MaxCode = 92 },
            input.Phenology,
            allowUnknown: true);
        var anthracnoseWeather = (input.RecentRainMm is { } ar && ar >= t.AnthracnoseRainMm)
            || (input.HumidityPercent is { } ah && ah >= t.AnthracnoseHumidityPercent);
        var anthracnoseDue = input.HasAnthracnoseOfficialWarning
            || (anthracnoseStage && anthracnoseWeather && IsAutumnish(athens.Month));

        FieldWorkRecentExecutionSignal? treatment = null;
        double? treatmentRainHours = null;
        foreach (var exec in input.RecentExecutions.Where(e => e.IsPlantProtectionTreatment))
        {
            var hours = (input.UtcNow - exec.CompletedAt).TotalHours;
            var rainfast = exec.RainfastHours ?? t.PostTreatmentDefaultRainfastHours;
            if (hours <= Math.Max(rainfast, t.TreatmentRainLookbackHours)
                && input.RecentRainMm is { } tr && tr >= t.PostTreatmentMinRainMm
                && hours <= rainfast + 24)
            {
                treatment = exec;
                treatmentRainHours = hours;
                break;
            }
        }

        FieldWorkRecentExecutionSignal? fertiliser = null;
        double? fertiliserHours = null;
        foreach (var exec in input.RecentExecutions.Where(e => e.IsSurfaceFertilisation))
        {
            var hours = (input.UtcNow - exec.CompletedAt).TotalHours;
            if (hours <= t.FertiliserRainLookbackHours
                && input.RecentRainMm is { } fr && fr >= t.FertiliserHeavyRainMm)
            {
                fertiliser = exec;
                fertiliserHours = hours;
                break;
            }
        }

        return new FieldWorkEventSignals
        {
            FrostInspectionDue = frostDue,
            FrostUrgent = frostUrgent,
            ForecastMinTempC = minTemp,
            StormInspectionDue = stormDue,
            MaxGustKmh = input.MaxGustKmh,
            StormRainMm = input.RecentRainMm,
            HeatInspectionDue = heatDue,
            HeatUrgent = heatUrgent,
            ForecastMaxTempC = maxTemp,
            PeacockSpotRiskReviewDue = peacockDue,
            AnthracnoseRiskReviewDue = anthracnoseDue,
            PostTreatmentRainReviewDue = treatment is not null,
            PostTreatmentRainMm = treatment is null ? null : input.RecentRainMm,
            HoursBetweenTreatmentAndRain = treatmentRainHours,
            PostTreatmentTaskId = treatment?.TaskId,
            FertiliserHeavyRainReviewDue = fertiliser is not null,
            FertiliserRainMm = fertiliser is null ? null : input.RecentRainMm,
            HoursBetweenFertilisationAndRain = fertiliserHours,
            FertiliserTaskId = fertiliser?.TaskId,
            SatelliteAnomalyReviewDue = input.HasActiveVegetationAlert
        };
    }

    private static bool IsPeacockSeason(int month) =>
        month is >= 3 and <= 5 or >= 9 and <= 11;

    private static bool IsAutumnish(int month) => month is >= 9 and <= 12;
}
