using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Application.DTOs.Chronologio;

/// <summary>
/// Living Timeline year axis.
/// Agricultural = ResultYear window 1 Feb YYYY → 31 Jan YYYY+1.
/// Season = cultivation period 1 Sep YYYY → 31 Aug YYYY+1 (legacy).
/// </summary>
public static class ChronologioAxis
{
    public const string Calendar = "calendar";
    public const string Season = "season";
    public const string Agricultural = "agricultural";

    public static bool IsSeason(string? axis) =>
        string.Equals(axis?.Trim(), Season, StringComparison.OrdinalIgnoreCase);

    public static bool IsAgricultural(string? axis) =>
        string.Equals(axis?.Trim(), Agricultural, StringComparison.OrdinalIgnoreCase);

    public static string Normalize(string? axis)
    {
        if (IsAgricultural(axis))
        {
            return Agricultural;
        }

        return IsSeason(axis) ? Season : Calendar;
    }

    public static int? ResolvePeriodYear(string? axis, int? year, int? season) =>
        IsSeason(axis) || IsAgricultural(axis) ? season ?? year : year ?? season;
}

/// <summary>
/// Olive cultivation season windows (UTC). Period labeled YYYY/YYYY+1 starts 1 Sep YYYY.
/// </summary>
public static class ChronologioSeasonCalendar
{
    public const int SeasonStartMonth = 9; // September

    public static (DateTime From, DateTime To) GetCalendarYearBounds(int year)
    {
        var fromAthens = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var toAthens = new DateTime(year + 1, 1, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var from = TimeZoneInfo.ConvertTimeToUtc(fromAthens, AthensTime.TimeZone);
        var toExclusive = TimeZoneInfo.ConvertTimeToUtc(toAthens, AthensTime.TimeZone);
        return (from, toExclusive.AddTicks(-1));
    }

    /// <summary>
    /// Season start year YYYY means 1 Sep YYYY → 31 Aug YYYY+1 in Europe/Athens.
    /// </summary>
    public static (DateTime From, DateTime To) GetSeasonBounds(int seasonStartYear)
    {
        var (from, toExclusive) = CultivationSeason.BoundsUtc(seasonStartYear);
        return (from, toExclusive.AddTicks(-1));
    }

    public static int GetCalendarYearKey(DateTime utc) =>
        AthensTime.CalendarYear(EnsureUtc(utc));

    /// <summary>
    /// Returns the season start year for an instant (Sep–Dec → same year; Jan–Aug → previous year) in Europe/Athens.
    /// </summary>
    public static int GetSeasonStartYear(DateTime utc) =>
        CultivationSeason.StartYearFor(EnsureUtc(utc));

    public static string FormatCalendarKey(int year) => year.ToString("D4");

    public static string FormatSeasonKey(int seasonStartYear) =>
        $"{seasonStartYear:D4}/{seasonStartYear + 1:D4}";

    public static int PeriodKeyFor(DateTime utc, string axis)
    {
        if (ChronologioAxis.IsAgricultural(axis))
        {
            return AgriculturalYear.For(EnsureUtc(utc));
        }

        return ChronologioAxis.IsSeason(axis) ? GetSeasonStartYear(utc) : GetCalendarYearKey(utc);
    }

    public static (DateTime From, DateTime To) BoundsForPeriod(int periodStartYear, string axis)
    {
        if (ChronologioAxis.IsAgricultural(axis))
        {
            return AgriculturalYear.InclusiveBoundsUtc(periodStartYear);
        }

        return ChronologioAxis.IsSeason(axis)
            ? GetSeasonBounds(periodStartYear)
            : GetCalendarYearBounds(periodStartYear);
    }

    /// <summary>
    /// Ordered (year, month) pairs covering a calendar year or a season window.
    /// </summary>
    public static IReadOnlyList<(int Year, int Month)> MonthsInPeriod(int periodStartYear, string axis)
    {
        if (ChronologioAxis.IsAgricultural(axis))
        {
            return AgriculturalYear.Months(periodStartYear);
        }

        if (ChronologioAxis.IsSeason(axis))
        {
            var list = new List<(int, int)>(12);
            for (var m = SeasonStartMonth; m <= 12; m++)
            {
                list.Add((periodStartYear, m));
            }

            for (var m = 1; m < SeasonStartMonth; m++)
            {
                list.Add((periodStartYear + 1, m));
            }

            return list;
        }

        return Enumerable.Range(1, 12).Select(m => (periodStartYear, m)).ToList();
    }

    private static DateTime EnsureUtc(DateTime value) =>
        value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
            : value.ToUniversalTime();
}

public class ChronologioSummaryQuery
{
    /// <summary>calendar | season</summary>
    public string Axis { get; set; } = ChronologioAxis.Calendar;

    public string? Category { get; set; }
    public string? FieldId { get; set; }

    /// <summary>Optional clamp for years list.</summary>
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }

    /// <summary>Calendar year or season start year when requesting month summaries.</summary>
    public int? PeriodYear { get; set; }
}

public class ChronologioPeriodSummaryDto
{
    /// <summary>e.g. "2026" or "2025/2026"</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Numeric start year (calendar year or season start year).</summary>
    public int PeriodYear { get; set; }

    public string Axis { get; set; } = ChronologioAxis.Calendar;
    public DateTime From { get; set; }
    public DateTime To { get; set; }

    public int TaskCount { get; set; }
    public int ExpenseCount { get; set; }
    public int HarvestCount { get; set; }
    public int NoteCount { get; set; }

    public decimal ExpenseTotal { get; set; }
    public string Currency { get; set; } = "EUR";

    public double OliveKg { get; set; }
    public double OilKg { get; set; }
    public double? OilYieldPercent { get; set; }

    public string? HeroMediaUrl { get; set; }

    public IReadOnlyList<string> HighlightTitles { get; set; } = Array.Empty<string>();

    public string? DominantWorkLabel { get; set; }
    public string? ObservationHighlight { get; set; }

    public double? RainfallMm { get; set; }
    public double? TemperatureMax { get; set; }
    public double? TemperatureMin { get; set; }
    public int? HeatDays { get; set; }
    public int? FrostNights { get; set; }
}

public class ChronologioMonthSummaryDto
{
    public string Key { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public DateTime From { get; set; }
    public DateTime To { get; set; }

    public int TaskCount { get; set; }
    public int ExpenseCount { get; set; }
    public int HarvestCount { get; set; }
    public int NoteCount { get; set; }

    public decimal ExpenseTotal { get; set; }
    public string Currency { get; set; } = "EUR";

    public double OliveKg { get; set; }
    public double OilKg { get; set; }
    public double? OilYieldPercent { get; set; }

    public string? HeroMediaUrl { get; set; }

    public IReadOnlyList<string> HighlightTitles { get; set; } = Array.Empty<string>();

    public string? DominantWorkLabel { get; set; }
    public string? ObservationHighlight { get; set; }

    public double? RainfallMm { get; set; }
    public double? TemperatureMax { get; set; }
    public double? TemperatureMin { get; set; }
    public int? HeatDays { get; set; }
    public int? FrostNights { get; set; }
}
