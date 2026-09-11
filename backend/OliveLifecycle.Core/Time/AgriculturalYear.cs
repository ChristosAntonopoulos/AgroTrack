using System.Globalization;

namespace OliveLifecycle.Core.Time;

/// <summary>
/// Olive agricultural / harvest year identified by <c>ResultYear</c>.
/// Default window: 1 February Y (inclusive) → 1 February Y+1 (exclusive), Europe/Athens.
/// January work stays with the harvest that began the previous February.
/// </summary>
public static class AgriculturalYear
{
    public const int StartMonth = 2; // February
    public const int StartDay = 1;

    public static int For(DateTime value)
    {
        var athens = AthensTime.ToAthens(value);
        return athens.Month >= StartMonth ? athens.Year : athens.Year - 1;
    }

    public static (DateTime FromInclusive, DateTime ToExclusive) BoundsUtc(int resultYear)
    {
        var fromAthens = new DateTime(resultYear, StartMonth, StartDay, 0, 0, 0, DateTimeKind.Unspecified);
        var toAthens = new DateTime(resultYear + 1, StartMonth, StartDay, 0, 0, 0, DateTimeKind.Unspecified);
        return (
            TimeZoneInfo.ConvertTimeToUtc(fromAthens, AthensTime.TimeZone),
            TimeZoneInfo.ConvertTimeToUtc(toAthens, AthensTime.TimeZone)
        );
    }

    public static (DateTime From, DateTime To) InclusiveBoundsUtc(int resultYear)
    {
        var (from, toExclusive) = BoundsUtc(resultYear);
        return (from, toExclusive.AddTicks(-1));
    }

    public static bool Contains(DateTime value, int resultYear) => For(value) == resultYear;

    public static IReadOnlyList<(int Year, int Month)> Months(int resultYear)
    {
        var list = new List<(int, int)>(12);
        for (var month = StartMonth; month <= 12; month++)
        {
            list.Add((resultYear, month));
        }

        for (var month = 1; month < StartMonth; month++)
        {
            list.Add((resultYear + 1, month));
        }

        return list;
    }

    public static string Title(int resultYear, string language = "el") =>
        language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
            ? $"Agricultural year {resultYear}"
            : $"Καλλιεργητική χρονιά {resultYear}";

    public static string RangeLabel(int resultYear, string language = "el")
    {
        var culture = language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
            ? CultureInfo.GetCultureInfo("en-GB")
            : CultureInfo.GetCultureInfo("el-GR");
        var from = new DateTime(resultYear, StartMonth, StartDay);
        var to = new DateTime(resultYear + 1, 1, 31);
        return $"{from.ToString("d MMM yyyy", culture)} – {to.ToString("d MMM yyyy", culture)}";
    }
}
