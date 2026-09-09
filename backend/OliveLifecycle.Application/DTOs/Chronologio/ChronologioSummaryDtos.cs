namespace OliveLifecycle.Application.DTOs.Chronologio;

/// <summary>
/// Living Timeline year axis. Season = cultivation period 1 Sep YYYY → 31 Aug YYYY+1.
/// </summary>
public static class ChronologioAxis
{
    public const string Calendar = "calendar";
    public const string Season = "season";

    public static bool IsSeason(string? axis) =>
        string.Equals(axis?.Trim(), Season, StringComparison.OrdinalIgnoreCase);

    public static string Normalize(string? axis) =>
        IsSeason(axis) ? Season : Calendar;
}

/// <summary>
/// Olive cultivation season windows (UTC). Period labeled YYYY/YYYY+1 starts 1 Sep YYYY.
/// </summary>
public static class ChronologioSeasonCalendar
{
    public const int SeasonStartMonth = 9; // September

    public static (DateTime From, DateTime To) GetCalendarYearBounds(int year)
    {
        var from = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var to = new DateTime(year, 12, 31, 23, 59, 59, DateTimeKind.Utc);
        return (from, to);
    }

    /// <summary>
    /// Season start year YYYY means 1 Sep YYYY → 31 Aug YYYY+1.
    /// </summary>
    public static (DateTime From, DateTime To) GetSeasonBounds(int seasonStartYear)
    {
        var from = new DateTime(seasonStartYear, SeasonStartMonth, 1, 0, 0, 0, DateTimeKind.Utc);
        var to = new DateTime(seasonStartYear + 1, SeasonStartMonth, 1, 0, 0, 0, DateTimeKind.Utc).AddTicks(-1);
        return (from, to);
    }

    public static int GetCalendarYearKey(DateTime utc) =>
        EnsureUtc(utc).Year;

    /// <summary>
    /// Returns the season start year for a UTC instant (Sep–Dec → same year; Jan–Aug → previous year).
    /// </summary>
    public static int GetSeasonStartYear(DateTime utc)
    {
        var d = EnsureUtc(utc);
        return d.Month >= SeasonStartMonth ? d.Year : d.Year - 1;
    }

    public static string FormatCalendarKey(int year) => year.ToString("D4");

    public static string FormatSeasonKey(int seasonStartYear) =>
        $"{seasonStartYear:D4}/{seasonStartYear + 1:D4}";

    public static int PeriodKeyFor(DateTime utc, string axis) =>
        ChronologioAxis.IsSeason(axis) ? GetSeasonStartYear(utc) : GetCalendarYearKey(utc);

    public static (DateTime From, DateTime To) BoundsForPeriod(int periodStartYear, string axis) =>
        ChronologioAxis.IsSeason(axis)
            ? GetSeasonBounds(periodStartYear)
            : GetCalendarYearBounds(periodStartYear);

    /// <summary>
    /// Ordered (year, month) pairs covering a calendar year or a season window.
    /// </summary>
    public static IReadOnlyList<(int Year, int Month)> MonthsInPeriod(int periodStartYear, string axis)
    {
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
}
