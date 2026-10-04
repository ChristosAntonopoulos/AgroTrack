using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Core.Entities.Geospatial;

namespace OliveLifecycle.Application.Services.Geospatial;

public interface IWeatherExtremeEventScanner
{
    /// <summary>
    /// Scans daily weather history and upserts Chronologio extreme-weather events.
    /// </summary>
    Task<int> ScanFieldAsync(string fieldId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Detects heatwave, frost, heavy rain, drought, and cold-spell stretches from
/// <see cref="FieldDailyWeatherSnapshot"/> rows after history backfill.
/// </summary>
public class WeatherExtremeEventScanner : IWeatherExtremeEventScanner
{
    private readonly IFieldDailyWeatherSnapshotRepository _snapshotRepository;
    private readonly IFieldWeatherExtremeEventRepository _eventRepository;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly GeospatialOptions _options;
    private readonly ILogger<WeatherExtremeEventScanner> _logger;

    public WeatherExtremeEventScanner(
        IFieldDailyWeatherSnapshotRepository snapshotRepository,
        IFieldWeatherExtremeEventRepository eventRepository,
        IDateTimeProvider dateTimeProvider,
        IOptions<GeospatialOptions> options,
        ILogger<WeatherExtremeEventScanner> logger)
    {
        _snapshotRepository = snapshotRepository;
        _eventRepository = eventRepository;
        _dateTimeProvider = dateTimeProvider;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<int> ScanFieldAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var years = Math.Max(0, _options.Weather.HistoryYears);
        if (years <= 0) return 0;

        var today = DateOnly.FromDateTime(_dateTimeProvider.UtcNow);
        var end = today;
        var start = end.AddYears(-years);

        var snapshots = await _snapshotRepository.GetHistoryAsync(fieldId, start, end, cancellationToken);
        if (snapshots.Count == 0) return 0;

        var events = DetectEvents(fieldId, snapshots, _options.ExtremeWeather, _dateTimeProvider.UtcNow);
        await _eventRepository.DeleteByFieldAndEndDateRangeAsync(fieldId, start, end, cancellationToken);
        if (events.Count == 0) return 0;

        await _eventRepository.UpsertManyAsync(events, cancellationToken);
        _logger.LogInformation(
            "Scanned {Count} extreme weather events for field {FieldId} ({From}–{To})",
            events.Count,
            fieldId,
            start,
            end);
        return events.Count;
    }

    /// <summary>Pure detection over an ordered day series — used by unit tests.</summary>
    public static IReadOnlyList<FieldWeatherExtremeEvent> DetectEvents(
        string fieldId,
        IReadOnlyList<FieldDailyWeatherSnapshot> snapshots,
        ExtremeWeatherOptions opts,
        DateTime nowUtc)
    {
        var days = snapshots
            .OrderBy(s => s.Date)
            .GroupBy(s => s.Date)
            .Select(g => g.Last())
            .ToList();

        if (days.Count == 0) return Array.Empty<FieldWeatherExtremeEvent>();

        var results = new List<FieldWeatherExtremeEvent>();
        results.AddRange(DetectHeatwaves(fieldId, days, opts, nowUtc));
        results.AddRange(DetectFrostDays(fieldId, days, opts, nowUtc));
        results.AddRange(DetectHeavyRainDays(fieldId, days, opts, nowUtc));
        results.AddRange(DetectDroughts(fieldId, days, opts, nowUtc));
        results.AddRange(DetectColdSpells(fieldId, days, opts, nowUtc));
        return results;
    }

    public static IEnumerable<FieldWeatherExtremeEvent> DetectHeatwaves(
        string fieldId,
        IReadOnlyList<FieldDailyWeatherSnapshot> days,
        ExtremeWeatherOptions opts,
        DateTime nowUtc)
    {
        return DetectTempStreaks(
            fieldId,
            days,
            nowUtc,
            kind: WeatherExtremeKinds.Heatwave,
            dayMatches: s => s.MaxTemperatureC is { } max && max >= opts.HeatwaveTempC,
            minDays: opts.HeatwaveMinDays,
            isStronger: streak => streak.Any(s => s.MaxTemperatureC is { } max && max >= opts.HeatwaveStrongTempC),
            severityFor: stronger => stronger ? WeatherExtremeSeverity.Critical : WeatherExtremeSeverity.Warning,
            metrics: streak => (
                Min: streak.Min(s => s.MinTemperatureC),
                Max: streak.Max(s => s.MaxTemperatureC),
                Rain: (double?)null));
    }

    public static IEnumerable<FieldWeatherExtremeEvent> DetectFrostDays(
        string fieldId,
        IReadOnlyList<FieldDailyWeatherSnapshot> days,
        ExtremeWeatherOptions opts,
        DateTime nowUtc)
    {
        foreach (var day in days)
        {
            if (day.MinTemperatureC is not { } min) continue;

            string kind;
            string severity;
            if (min <= opts.FrostTempC)
            {
                kind = WeatherExtremeKinds.Frost;
                severity = WeatherExtremeSeverity.Critical;
            }
            else if (min <= opts.NearFrostTempC)
            {
                kind = WeatherExtremeKinds.NearFrost;
                severity = WeatherExtremeSeverity.Warning;
            }
            else
            {
                continue;
            }

            yield return BuildEvent(
                fieldId,
                kind,
                severity,
                day.Date,
                day.Date,
                streakDays: 1,
                minTemp: min,
                maxTemp: day.MaxTemperatureC,
                rainMm: null,
                isStronger: min <= opts.FrostTempC - 2,
                provider: day.Provider,
                nowUtc: nowUtc);
        }
    }

    public static IEnumerable<FieldWeatherExtremeEvent> DetectHeavyRainDays(
        string fieldId,
        IReadOnlyList<FieldDailyWeatherSnapshot> days,
        ExtremeWeatherOptions opts,
        DateTime nowUtc)
    {
        foreach (var day in days)
        {
            if (day.RainTotalMm is not { } rain || rain < opts.HeavyRainMm) continue;
            var stronger = rain >= opts.ExtremeRainMm;
            yield return BuildEvent(
                fieldId,
                WeatherExtremeKinds.HeavyRain,
                stronger ? WeatherExtremeSeverity.Critical : WeatherExtremeSeverity.Warning,
                day.Date,
                day.Date,
                streakDays: 1,
                minTemp: day.MinTemperatureC,
                maxTemp: day.MaxTemperatureC,
                rainMm: rain,
                isStronger: stronger,
                provider: day.Provider,
                nowUtc: nowUtc);
        }
    }

    public static IEnumerable<FieldWeatherExtremeEvent> DetectDroughts(
        string fieldId,
        IReadOnlyList<FieldDailyWeatherSnapshot> days,
        ExtremeWeatherOptions opts,
        DateTime nowUtc)
    {
        var byDate = days.ToDictionary(d => d.Date);
        if (byDate.Count == 0) yield break;

        var cursor = byDate.Keys.Min();
        var last = byDate.Keys.Max();
        DateOnly? streakStart = null;
        double streakRain = 0;
        var streakDays = new List<FieldDailyWeatherSnapshot>();

        FieldWeatherExtremeEvent? Flush()
        {
            if (streakStart is null || streakDays.Count < opts.DroughtMinDays) return null;
            if (streakRain >= opts.DroughtMaxTotalRainMm) return null;
            return BuildEvent(
                fieldId,
                WeatherExtremeKinds.Drought,
                WeatherExtremeSeverity.Warning,
                streakStart.Value,
                streakDays[^1].Date,
                streakDays.Count,
                streakDays.Min(s => s.MinTemperatureC),
                streakDays.Max(s => s.MaxTemperatureC),
                streakRain,
                isStronger: streakDays.Count >= opts.DroughtMinDays + 10,
                provider: streakDays[^1].Provider,
                nowUtc: nowUtc);
        }

        void Reset()
        {
            streakStart = null;
            streakRain = 0;
            streakDays.Clear();
        }

        while (cursor <= last)
        {
            if (!byDate.TryGetValue(cursor, out var snap))
            {
                var gapFlush = Flush();
                if (gapFlush != null) yield return gapFlush;
                Reset();
                cursor = cursor.AddDays(1);
                continue;
            }

            var rain = snap.RainTotalMm ?? 0;
            if (streakStart is null)
            {
                if (rain < opts.DroughtMaxTotalRainMm)
                {
                    streakStart = cursor;
                    streakRain = rain;
                    streakDays.Add(snap);
                }
            }
            else if (streakRain + rain < opts.DroughtMaxTotalRainMm)
            {
                streakRain += rain;
                streakDays.Add(snap);
            }
            else
            {
                var capped = Flush();
                if (capped != null) yield return capped;
                Reset();
                if (rain < opts.DroughtMaxTotalRainMm)
                {
                    streakStart = cursor;
                    streakRain = rain;
                    streakDays.Add(snap);
                }
            }

            cursor = cursor.AddDays(1);
        }

        var endFlush = Flush();
        if (endFlush != null) yield return endFlush;
    }

    public static IEnumerable<FieldWeatherExtremeEvent> DetectColdSpells(
        string fieldId,
        IReadOnlyList<FieldDailyWeatherSnapshot> days,
        ExtremeWeatherOptions opts,
        DateTime nowUtc)
    {
        bool Matches(FieldDailyWeatherSnapshot s)
        {
            if (s.MaxTemperatureC is not { } max) return false;
            var month = s.Date.Month;
            var deepWinter = month is 12 or 1 or 2;
            return deepWinter
                ? max <= opts.ColdSpellWinterMaxTempC
                : max <= opts.ColdSpellMaxTempC;
        }

        return DetectTempStreaks(
            fieldId,
            days,
            nowUtc,
            kind: WeatherExtremeKinds.ColdSpell,
            dayMatches: Matches,
            minDays: opts.ColdSpellMinDays,
            isStronger: _ => false,
            severityFor: _ => WeatherExtremeSeverity.Warning,
            metrics: streak => (
                Min: streak.Min(s => s.MinTemperatureC),
                Max: streak.Max(s => s.MaxTemperatureC),
                Rain: (double?)null));
    }

    private static IEnumerable<FieldWeatherExtremeEvent> DetectTempStreaks(
        string fieldId,
        IReadOnlyList<FieldDailyWeatherSnapshot> days,
        DateTime nowUtc,
        string kind,
        Func<FieldDailyWeatherSnapshot, bool> dayMatches,
        int minDays,
        Func<IReadOnlyList<FieldDailyWeatherSnapshot>, bool> isStronger,
        Func<bool, string> severityFor,
        Func<IReadOnlyList<FieldDailyWeatherSnapshot>, (double? Min, double? Max, double? Rain)> metrics)
    {
        var byDate = days.ToDictionary(d => d.Date);
        if (byDate.Count == 0) yield break;

        var cursor = byDate.Keys.Min();
        var last = byDate.Keys.Max();
        var streak = new List<FieldDailyWeatherSnapshot>();

        FieldWeatherExtremeEvent? FlushStreak()
        {
            if (streak.Count < minDays) return null;
            var stronger = isStronger(streak);
            var m = metrics(streak);
            return BuildEvent(
                fieldId,
                kind,
                severityFor(stronger),
                streak[0].Date,
                streak[^1].Date,
                streak.Count,
                m.Min,
                m.Max,
                m.Rain,
                stronger,
                streak[^1].Provider,
                nowUtc);
        }

        while (cursor <= last)
        {
            if (byDate.TryGetValue(cursor, out var snap) && dayMatches(snap))
            {
                if (streak.Count > 0 && streak[^1].Date.AddDays(1) != cursor)
                {
                    var flushed = FlushStreak();
                    if (flushed != null) yield return flushed;
                    streak.Clear();
                }

                streak.Add(snap);
            }
            else
            {
                var flushed = FlushStreak();
                if (flushed != null) yield return flushed;
                streak.Clear();
            }

            cursor = cursor.AddDays(1);
        }

        var lastFlush = FlushStreak();
        if (lastFlush != null) yield return lastFlush;
    }

    private static FieldWeatherExtremeEvent BuildEvent(
        string fieldId,
        string kind,
        string severity,
        DateOnly start,
        DateOnly end,
        int streakDays,
        double? minTemp,
        double? maxTemp,
        double? rainMm,
        bool isStronger,
        string provider,
        DateTime nowUtc)
    {
        var dedup = $"{kind}_{fieldId}_{start:yyyyMMdd}";
        return new FieldWeatherExtremeEvent
        {
            Id = dedup,
            FieldId = fieldId,
            DedupKey = dedup,
            Kind = kind,
            Severity = severity,
            StartDate = start,
            EndDate = end,
            OccurredAt = DateTime.SpecifyKind(end.ToDateTime(new TimeOnly(12, 0)), DateTimeKind.Utc),
            StreakDays = streakDays,
            MinTemperatureC = minTemp,
            MaxTemperatureC = maxTemp,
            RainTotalMm = rainMm,
            IsStronger = isStronger,
            WeatherProvider = provider,
            CreatedAt = nowUtc,
            UpdatedAt = nowUtc
        };
    }
}
