namespace OliveLifecycle.Core.Time;

/// <summary>
/// Olive cultivation season: 1 September Y (inclusive) → 1 September Y+1 (exclusive), Europe/Athens.
/// The season is identified by its start year (the year that contains September–December).
/// </summary>
public static class CultivationSeason
{
    public const int StartMonth = 9; // September

    public static int StartYearFor(DateTime value)
    {
        var athens = AthensTime.ToAthens(value);
        return athens.Month >= StartMonth ? athens.Year : athens.Year - 1;
    }

    public static (DateTime FromInclusive, DateTime ToExclusive) BoundsUtc(int seasonStartYear)
    {
        var fromAthens = new DateTime(seasonStartYear, StartMonth, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var toAthens = new DateTime(seasonStartYear + 1, StartMonth, 1, 0, 0, 0, DateTimeKind.Unspecified);
        return (
            TimeZoneInfo.ConvertTimeToUtc(fromAthens, AthensTime.TimeZone),
            TimeZoneInfo.ConvertTimeToUtc(toAthens, AthensTime.TimeZone)
        );
    }

    public static bool Contains(DateTime value, int seasonStartYear)
    {
        return StartYearFor(value) == seasonStartYear;
    }

    public static bool MatchesPeriod(DateTime value, int year, string? periodBasis)
    {
        if (string.Equals(periodBasis, "season", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(periodBasis, "cultivation", StringComparison.OrdinalIgnoreCase))
        {
            return Contains(value, year);
        }

        return AthensTime.CalendarYear(value) == year;
    }
}
