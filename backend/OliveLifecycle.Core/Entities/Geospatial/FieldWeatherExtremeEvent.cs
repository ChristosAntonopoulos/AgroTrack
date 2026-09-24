namespace OliveLifecycle.Core.Entities.Geospatial;

/// <summary>
/// A detected extreme weather stretch or day for Chronologio compact cards.
/// Built from <see cref="FieldDailyWeatherSnapshot"/> after history backfill.
/// </summary>
public class FieldWeatherExtremeEvent : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;

    /// <summary>Stable upsert key: {kind}_{fieldId}_{start:yyyyMMdd}.</summary>
    public string DedupKey { get; set; } = string.Empty;

    /// <summary>One of <see cref="WeatherExtremeKinds"/>.</summary>
    public string Kind { get; set; } = string.Empty;

    /// <summary>"warning" or "critical".</summary>
    public string Severity { get; set; } = WeatherExtremeSeverity.Warning;

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    /// <summary>Chronologio OccurredAt — end of the streak (UTC noon).</summary>
    public DateTime OccurredAt { get; set; }

    public int StreakDays { get; set; }
    public double? MinTemperatureC { get; set; }
    public double? MaxTemperatureC { get; set; }
    public double? RainTotalMm { get; set; }

    /// <summary>Stronger threshold met (e.g. heat ≥40°C, rain ≥50 mm).</summary>
    public bool IsStronger { get; set; }

    public string WeatherProvider { get; set; } = string.Empty;
}

public static class WeatherExtremeKinds
{
    public const string Heatwave = "heatwave";
    public const string Frost = "frost";
    public const string NearFrost = "nearFrost";
    public const string HeavyRain = "heavyRain";
    public const string Drought = "drought";
    public const string ColdSpell = "coldSpell";
}

public static class WeatherExtremeSeverity
{
    public const string Warning = "warning";
    public const string Critical = "critical";
}
