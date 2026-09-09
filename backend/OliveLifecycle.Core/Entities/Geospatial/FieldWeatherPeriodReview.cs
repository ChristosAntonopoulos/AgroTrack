namespace OliveLifecycle.Core.Entities.Geospatial;

/// <summary>
/// Compiled month or year weather summary for Chronologio journal cards.
/// Built from daily weather snapshots and usable Sentinel-2 observations.
/// </summary>
public class FieldWeatherPeriodReview : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;

    /// <summary>"month" or "year".</summary>
    public string PeriodType { get; set; } = "month";

    public int Year { get; set; }

    /// <summary>1–12 for month reviews; null for year reviews.</summary>
    public int? Month { get; set; }

    /// <summary>Last day of the month or 31 Dec — Chronologio OccurredAt.</summary>
    public DateTime OccurredAt { get; set; }

    public double RainTotalMm { get; set; }
    public double? MinTemperatureC { get; set; }
    public double? MaxTemperatureC { get; set; }
    public int FrostNights { get; set; }
    public int HeatDays { get; set; }

    /// <summary>Days with rain at or above the heavy-rain threshold (default 20 mm).</summary>
    public int HeavyRainDays { get; set; }

    /// <summary>Longest consecutive stretch of nearly dry days in the period.</summary>
    public int LongestDryStreakDays { get; set; }

    /// <summary>
    /// Rain vs the same month last year (month reviews) or previous calendar year (year reviews).
    /// Positive means wetter than the prior period.
    /// </summary>
    public double? RainVsPreviousPercent { get; set; }

    /// <summary>1–12 for year reviews; null for month reviews.</summary>
    public int? WettestMonth { get; set; }

    public double? NdviMean { get; set; }
    public double? NdviDeltaPercent { get; set; }

    /// <summary>Daily rain for month reviews; monthly rain totals for year reviews.</summary>
    public IReadOnlyList<double> RainSeries { get; set; } = Array.Empty<double>();

    /// <summary>Labels aligned with RainSeries (day numbers or month abbreviations).</summary>
    public IReadOnlyList<string> RainLabels { get; set; } = Array.Empty<string>();

    public int DayCount { get; set; }
    public int UsableSatelliteCount { get; set; }

    public string WeatherProvider { get; set; } = string.Empty;
    public string? SatelliteSource { get; set; }
}

public static class WeatherPeriodTypes
{
    public const string Month = "month";
    public const string Year = "year";
}
