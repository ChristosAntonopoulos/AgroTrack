namespace OliveLifecycle.Core.Time;

/// <summary>Business calendar for Oleachron is Europe/Athens.</summary>
public static class AthensTime
{
    private static readonly TimeZoneInfo Zone = ResolveZone();

    public static TimeZoneInfo TimeZone => Zone;

    public static DateTime ToAthens(DateTime value)
    {
        if (value.Kind == DateTimeKind.Unspecified && value.TimeOfDay == TimeSpan.Zero)
        {
            // Date-only midnight: treat as an Athens calendar day, not a UTC instant.
            return DateTime.SpecifyKind(value, DateTimeKind.Unspecified);
        }

        var utc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

        return TimeZoneInfo.ConvertTimeFromUtc(utc, Zone);
    }

    public static int CalendarYear(DateTime value) => ToAthens(value).Year;

    public static DateOnly CalendarDate(DateTime value)
    {
        var athens = ToAthens(value);
        return DateOnly.FromDateTime(athens);
    }

    private static TimeZoneInfo ResolveZone()
    {
        foreach (var id in new[] { "Europe/Athens", "GTB Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
                // try next
            }
            catch (InvalidTimeZoneException)
            {
                // try next
            }
        }

        return TimeZoneInfo.Utc;
    }
}
