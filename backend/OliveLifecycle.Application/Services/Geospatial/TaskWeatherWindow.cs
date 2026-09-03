using OliveLifecycle.Application.DTOs.Geospatial;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Services.Geospatial;

/// <summary>
/// The forecast horizon that actually covers a task's scheduled window, together with
/// how much confidence that lead time deserves. Judging a task scheduled for next week
/// against tomorrow's forecast would be misleading, so those tasks are skipped.
/// </summary>
public sealed record TaskWeatherWindow(
    string Label,
    double RainMm,
    double MaxWindKmh,
    DataConfidenceLevel Confidence)
{
    /// <summary>Beyond this lead time an hourly forecast carries no useful signal for a task.</summary>
    public const int MaxLeadHours = 48;

    /// <summary>
    /// Picks the tightest forecast window that still reaches the task's start. A task
    /// with no schedule is treated as imminent, since it can be started at any time.
    /// </summary>
    public static TaskWeatherWindow? For(FieldWeatherDto weather, DateTime? scheduledStart, DateTime now)
    {
        var leadHours = scheduledStart.HasValue
            ? (scheduledStart.Value - now).TotalHours
            : 0;

        if (leadHours > MaxLeadHours) return null;

        // A task already under way is judged on the immediate forecast.
        var effective = Math.Max(leadHours, 0);

        return effective switch
        {
            <= 3 => new TaskWeatherWindow("the next 3 hours", weather.Rain.Forecast3hMm, weather.Wind.MaxNext6hKmh, DataConfidenceLevel.High),
            <= 6 => new TaskWeatherWindow("the next 6 hours", weather.Rain.Forecast6hMm, weather.Wind.MaxNext6hKmh, DataConfidenceLevel.High),
            <= 12 => new TaskWeatherWindow("the next 12 hours", weather.Rain.Forecast12hMm, weather.Wind.MaxNext12hKmh, DataConfidenceLevel.High),
            <= 24 => new TaskWeatherWindow("the next 24 hours", weather.Rain.Forecast24hMm, weather.Wind.MaxNext24hKmh, DataConfidenceLevel.Medium),
            _ => new TaskWeatherWindow("the next 48 hours", weather.Rain.Forecast48hMm, weather.Wind.MaxNext24hKmh, DataConfidenceLevel.Low)
        };
    }
}
