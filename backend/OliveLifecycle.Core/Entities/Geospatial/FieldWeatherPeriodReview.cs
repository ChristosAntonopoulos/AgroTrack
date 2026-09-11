namespace OliveLifecycle.Core.Entities.Geospatial;

/// <summary>
/// Compiled month or year weather snapshot for Chronologio journal cards.
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
    public double? AverageTemperatureC { get; set; }
    public int FrostNights { get; set; }
    public int HeatDays { get; set; }

    /// <summary>Days with rain at or above the heavy-rain threshold (default 20 mm).</summary>
    public int HeavyRainDays { get; set; }

    /// <summary>Longest consecutive stretch of nearly dry days in the period.</summary>
    public int LongestDryStreakDays { get; set; }

    public int RainyDays { get; set; }
    public int DryDays { get; set; }

    public double? Et0TotalMm { get; set; }

    /// <summary>Rain minus ET0. Negative means the field lost more water than it received.</summary>
    public double? WaterBalanceMm { get; set; }

    public double? AverageHumidityPercent { get; set; }
    public double? MaxWindGustKmh { get; set; }

    /// <summary>
    /// Rain vs the same month last year (month reviews) or previous calendar year (year reviews).
    /// Positive means wetter than the prior period.
    /// </summary>
    public double? RainVsPreviousPercent { get; set; }

    /// <summary>1–12 for year reviews; null for month reviews.</summary>
    public int? WettestMonth { get; set; }

    public double? NdviMean { get; set; }
    public double? NdviDeltaPercent { get; set; }

    /// <summary>NDVI change from the opening satellite scene to the closing scene.</summary>
    public double? NdviStartEndDeltaPercent { get; set; }

    public double? NdmiMean { get; set; }
    public double? NdreMean { get; set; }
    public double? NdwiMean { get; set; }
    public double? SaviMean { get; set; }

    /// <summary>Last usable scene at or before the period opened.</summary>
    public WeatherReviewSatelliteScene? OpeningScene { get; set; }

    /// <summary>Last usable scene inside the period (end-of-month / end-of-year look).</summary>
    public WeatherReviewSatelliteScene? ClosingScene { get; set; }

    /// <summary>Machine-readable highlights for UI translation.</summary>
    public IReadOnlyList<WeatherPeriodInsight> Insights { get; set; } = Array.Empty<WeatherPeriodInsight>();

    /// <summary>Daily rain for month reviews; monthly rain totals for year reviews.</summary>
    public IReadOnlyList<double> RainSeries { get; set; } = Array.Empty<double>();

    /// <summary>Labels aligned with RainSeries (day numbers or month abbreviations).</summary>
    public IReadOnlyList<string> RainLabels { get; set; } = Array.Empty<string>();

    /// <summary>Daily min temps for month reviews. Null slots are days without a measurement.</summary>
    public IReadOnlyList<double?> TemperatureMinSeries { get; set; } = Array.Empty<double?>();

    /// <summary>Daily max temps for month reviews. Null slots are days without a measurement.</summary>
    public IReadOnlyList<double?> TemperatureMaxSeries { get; set; } = Array.Empty<double?>();

    public int DayCount { get; set; }
    /// <summary>Days in the actual period window (excludes future dates).</summary>
    public int ExpectedDays { get; set; }
    /// <summary>Days whose rainfall measurement is present. Missing is not zero.</summary>
    public int DaysWithRainData { get; set; }
    /// <summary>Period reviews are historical snapshots only.</summary>
    public bool IncludesForecast { get; set; }
    public int UsableSatelliteCount { get; set; }

    public string WeatherProvider { get; set; } = string.Empty;
    public string? SatelliteSource { get; set; }
}

public class WeatherReviewSatelliteScene
{
    public string ObservationId { get; set; } = string.Empty;
    public DateTime ObservationDate { get; set; }
    public string Role { get; set; } = "closing";
    public string? TrueColorPath { get; set; }
    public string? NdviPath { get; set; }
    public double? NdviMean { get; set; }
    public double? NdmiMean { get; set; }
    public double? CloudCoverPercent { get; set; }
}

public class WeatherPeriodInsight
{
    public string Kind { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
}

public static class WeatherPeriodTypes
{
    public const string Month = "month";
    public const string Year = "year";
}

public static class WeatherInsightKinds
{
    public const string Frost = "frost";
    public const string Heat = "heat";
    public const string HeavyRain = "heavyRain";
    public const string Dry = "dry";
    public const string WaterDeficit = "waterDeficit";
    public const string WaterSurplus = "waterSurplus";
    public const string Wetter = "wetter";
    public const string Drier = "drier";
    public const string Greener = "greener";
    public const string Browner = "browner";
    public const string MoistureUp = "moistureUp";
    public const string MoistureDown = "moistureDown";
}

public static class WeatherInsightSeverity
{
    public const string Info = "info";
    public const string Watch = "watch";
    public const string Alert = "alert";
}
