using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Core.Entities.Geospatial;

namespace OliveLifecycle.Application.Services.Geospatial;

public interface IWeatherReviewCompiler
{
    /// <summary>
    /// Rebuilds month and year reviews for the configured history window.
    /// Incomplete periods (too few weather days) are skipped.
    /// </summary>
    Task<int> RebuildForFieldAsync(string fieldId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Refreshes the in-progress month (and prior year when crossing year boundary).
    /// </summary>
    Task RebuildCurrentAsync(string fieldId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Compiles daily Open-Meteo snapshots and usable Sentinel-2 observations into
/// one Chronologio-friendly review per calendar month and calendar year.
/// </summary>
public class WeatherReviewCompiler : IWeatherReviewCompiler
{
    internal const int MinMonthDays = 20;
    internal const int MinYearDays = 200;
    internal const double HeavyRainMm = 20;
    internal const double DryDayMaxMm = 0.5;

    private static readonly string[] MonthLabels =
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    private readonly IFieldDailyWeatherSnapshotRepository _snapshotRepository;
    private readonly IFieldSatelliteObservationRepository _satelliteRepository;
    private readonly IFieldWeatherPeriodReviewRepository _reviewRepository;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly GeospatialOptions _options;
    private readonly ILogger<WeatherReviewCompiler> _logger;

    public WeatherReviewCompiler(
        IFieldDailyWeatherSnapshotRepository snapshotRepository,
        IFieldSatelliteObservationRepository satelliteRepository,
        IFieldWeatherPeriodReviewRepository reviewRepository,
        IDateTimeProvider dateTimeProvider,
        IOptions<GeospatialOptions> options,
        ILogger<WeatherReviewCompiler> logger)
    {
        _snapshotRepository = snapshotRepository;
        _satelliteRepository = satelliteRepository;
        _reviewRepository = reviewRepository;
        _dateTimeProvider = dateTimeProvider;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<int> RebuildForFieldAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var years = Math.Max(0, _options.Weather.HistoryYears);
        if (years <= 0) return 0;

        var today = DateOnly.FromDateTime(_dateTimeProvider.UtcNow);
        var end = today;
        var start = end.AddYears(-years);

        var snapshots = await _snapshotRepository.GetHistoryAsync(fieldId, start, end, cancellationToken);
        var satFrom = start.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var satTo = end.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
        var observations = await _satelliteRepository.GetUsableInRangeAsync(fieldId, satFrom, satTo, cancellationToken);

        var reviews = new List<FieldWeatherPeriodReview>();
        var cursor = new DateOnly(start.Year, start.Month, 1);
        var lastMonth = new DateOnly(end.Year, end.Month, 1);

        while (cursor <= lastMonth)
        {
            var monthReview = BuildMonthReview(fieldId, cursor.Year, cursor.Month, snapshots, observations, today);
            if (monthReview != null) reviews.Add(monthReview);
            cursor = cursor.AddMonths(1);
        }

        for (var year = start.Year; year <= end.Year; year++)
        {
            var yearReview = BuildYearReview(fieldId, year, snapshots, observations, today);
            if (yearReview != null) reviews.Add(yearReview);
        }

        if (reviews.Count == 0) return 0;

        var written = await _reviewRepository.UpsertManyAsync(reviews, cancellationToken);
        _logger.LogInformation(
            "Compiled {Count} weather period reviews for field {FieldId}",
            written, fieldId);
        return written;
    }

    public async Task RebuildCurrentAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(_dateTimeProvider.UtcNow);
        var yesterday = today.AddDays(-1);

        // Load a padded window so previous-period NDVI comparison works.
        var from = new DateOnly(yesterday.Year, 1, 1).AddYears(-1);
        var to = today;
        var snapshots = await _snapshotRepository.GetHistoryAsync(fieldId, from, to, cancellationToken);
        var observations = await _satelliteRepository.GetUsableInRangeAsync(
            fieldId,
            from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            to.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc),
            cancellationToken);

        var reviews = new List<FieldWeatherPeriodReview>();

        var currentMonth = BuildMonthReview(fieldId, yesterday.Year, yesterday.Month, snapshots, observations, today);
        if (currentMonth != null) reviews.Add(currentMonth);

        // When yesterday closed a month, that month is already covered above.
        // Always refresh the calendar year that contains yesterday.
        var yearReview = BuildYearReview(fieldId, yesterday.Year, snapshots, observations, today);
        if (yearReview != null) reviews.Add(yearReview);

        if (reviews.Count == 0) return;
        await _reviewRepository.UpsertManyAsync(reviews, cancellationToken);
    }

    public FieldWeatherPeriodReview? BuildMonthReview(
        string fieldId,
        int year,
        int month,
        IReadOnlyList<FieldDailyWeatherSnapshot> snapshots,
        IReadOnlyList<FieldSatelliteObservation> observations,
        DateOnly today)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var monthStart = new DateOnly(year, month, 1);
        var monthEnd = new DateOnly(year, month, daysInMonth);
        var isCurrentMonth = today.Year == year && today.Month == month;
        var effectiveEnd = isCurrentMonth ? today.AddDays(-1) : monthEnd;
        if (effectiveEnd < monthStart) return null;

        var days = snapshots
            .Where(s => s.Date.Year == year && s.Date.Month == month && s.Date <= effectiveEnd)
            .OrderBy(s => s.Date)
            .ToList();

        var requiredDays = isCurrentMonth
            ? Math.Min(MinMonthDays, Math.Max(1, effectiveEnd.Day))
            : MinMonthDays;

        if (days.Count < requiredDays) return null;

        var rainByDay = new double[daysInMonth];
        var labels = new string[daysInMonth];
        for (var d = 1; d <= daysInMonth; d++)
        {
            labels[d - 1] = d.ToString();
            var snap = days.FirstOrDefault(s => s.Date.Day == d);
            rainByDay[d - 1] = snap?.RainTotalMm ?? 0;
        }

        var mins = days.Where(s => s.MinTemperatureC.HasValue).Select(s => s.MinTemperatureC!.Value).ToList();
        var maxs = days.Where(s => s.MaxTemperatureC.HasValue).Select(s => s.MaxTemperatureC!.Value).ToList();
        var heatThreshold = _options.TaskRules.HeatStressTempC;
        var frostNights = days.Count(s => s.MinTemperatureC is <= 0);
        var heatDays = days.Count(s => s.MaxTemperatureC is { } max && max >= heatThreshold);
        var heavyRainDays = days.Count(s => (s.RainTotalMm ?? 0) >= HeavyRainMm);
        var dryStreak = LongestDryStreak(days);
        var rainTotal = Math.Round(days.Sum(s => s.RainTotalMm ?? 0), 1);
        var rainVsPrevious = RainChangePercent(
            rainTotal,
            snapshots
                .Where(s => s.Date.Year == year - 1 && s.Date.Month == month)
                .Sum(s => s.RainTotalMm ?? 0));

        var obsInMonth = observations
            .Where(o =>
            {
                var d = DateOnly.FromDateTime(o.ObservationDate);
                return d.Year == year && d.Month == month && o.IsUsable && o.NdviStats != null;
            })
            .ToList();

        double? ndviMean = obsInMonth.Count > 0
            ? obsInMonth.Average(o => o.NdviStats!.Mean)
            : null;

        double? ndviDelta = null;
        if (ndviMean.HasValue)
        {
            var prev = monthStart.AddMonths(-1);
            var prevObs = observations
                .Where(o =>
                {
                    var d = DateOnly.FromDateTime(o.ObservationDate);
                    return d.Year == prev.Year && d.Month == prev.Month && o.IsUsable && o.NdviStats != null;
                })
                .ToList();
            if (prevObs.Count > 0)
            {
                var prevMean = prevObs.Average(o => o.NdviStats!.Mean);
                if (Math.Abs(prevMean) > 0.001)
                {
                    ndviDelta = (ndviMean.Value - prevMean) / Math.Abs(prevMean) * 100.0;
                }
            }
        }

        var occurredAt = new DateTime(year, month, daysInMonth, 12, 0, 0, DateTimeKind.Utc);
        var provider = days.Select(d => d.Provider).FirstOrDefault(p => !string.IsNullOrWhiteSpace(p)) ?? "Open-Meteo";

        return new FieldWeatherPeriodReview
        {
            Id = BuildId(fieldId, WeatherPeriodTypes.Month, year, month),
            FieldId = fieldId,
            PeriodType = WeatherPeriodTypes.Month,
            Year = year,
            Month = month,
            OccurredAt = occurredAt,
            RainTotalMm = rainTotal,
            MinTemperatureC = mins.Count > 0 ? Math.Round(mins.Min(), 1) : null,
            MaxTemperatureC = maxs.Count > 0 ? Math.Round(maxs.Max(), 1) : null,
            FrostNights = frostNights,
            HeatDays = heatDays,
            HeavyRainDays = heavyRainDays,
            LongestDryStreakDays = dryStreak,
            RainVsPreviousPercent = rainVsPrevious,
            WettestMonth = null,
            NdviMean = ndviMean.HasValue ? Math.Round(ndviMean.Value, 3) : null,
            NdviDeltaPercent = ndviDelta.HasValue ? Math.Round(ndviDelta.Value, 1) : null,
            RainSeries = rainByDay,
            RainLabels = labels,
            DayCount = days.Count,
            UsableSatelliteCount = obsInMonth.Count,
            WeatherProvider = provider,
            SatelliteSource = obsInMonth.Count > 0 ? "Sentinel-2" : null,
            CreatedAt = _dateTimeProvider.UtcNow,
            UpdatedAt = _dateTimeProvider.UtcNow
        };
    }

    public FieldWeatherPeriodReview? BuildYearReview(
        string fieldId,
        int year,
        IReadOnlyList<FieldDailyWeatherSnapshot> snapshots,
        IReadOnlyList<FieldSatelliteObservation> observations,
        DateOnly today)
    {
        var yearStart = new DateOnly(year, 1, 1);
        var yearEnd = new DateOnly(year, 12, 31);
        var isCurrentYear = today.Year == year;
        var effectiveEnd = isCurrentYear ? today.AddDays(-1) : yearEnd;
        if (effectiveEnd < yearStart) return null;

        var days = snapshots
            .Where(s => s.Date.Year == year && s.Date <= effectiveEnd)
            .OrderBy(s => s.Date)
            .ToList();

        var requiredDays = isCurrentYear
            ? Math.Min(MinYearDays, Math.Max(1, effectiveEnd.DayNumber - yearStart.DayNumber + 1))
            : MinYearDays;

        // For early months of the current year, allow a proportional threshold.
        if (isCurrentYear)
        {
            var elapsed = effectiveEnd.DayNumber - yearStart.DayNumber + 1;
            requiredDays = Math.Max(20, (int)(elapsed * 0.55));
        }

        if (days.Count < requiredDays) return null;

        var monthlyRain = new double[12];
        for (var m = 1; m <= 12; m++)
        {
            monthlyRain[m - 1] = Math.Round(
                days.Where(s => s.Date.Month == m).Sum(s => s.RainTotalMm ?? 0), 1);
        }

        var heatThreshold = _options.TaskRules.HeatStressTempC;
        var frostNights = days.Count(s => s.MinTemperatureC is <= 0);
        var heatDays = days.Count(s => s.MaxTemperatureC is { } max && max >= heatThreshold);
        var heavyRainDays = days.Count(s => (s.RainTotalMm ?? 0) >= HeavyRainMm);
        var dryStreak = LongestDryStreak(days);
        var mins = days.Where(s => s.MinTemperatureC.HasValue).Select(s => s.MinTemperatureC!.Value).ToList();
        var maxs = days.Where(s => s.MaxTemperatureC.HasValue).Select(s => s.MaxTemperatureC!.Value).ToList();
        var rainTotal = Math.Round(days.Sum(s => s.RainTotalMm ?? 0), 1);
        var rainVsPrevious = RainChangePercent(
            rainTotal,
            snapshots.Where(s => s.Date.Year == year - 1).Sum(s => s.RainTotalMm ?? 0));

        int? wettestMonth = null;
        var wettestMm = -1.0;
        for (var m = 1; m <= 12; m++)
        {
            if (monthlyRain[m - 1] > wettestMm)
            {
                wettestMm = monthlyRain[m - 1];
                wettestMonth = m;
            }
        }

        if (wettestMm <= 0) wettestMonth = null;

        var obsInYear = observations
            .Where(o =>
            {
                var d = DateOnly.FromDateTime(o.ObservationDate);
                return d.Year == year && o.IsUsable && o.NdviStats != null;
            })
            .ToList();

        double? ndviMean = obsInYear.Count >= 3
            ? obsInYear.Average(o => o.NdviStats!.Mean)
            : null;

        double? ndviDelta = null;
        if (ndviMean.HasValue)
        {
            var prevObs = observations
                .Where(o =>
                {
                    var d = DateOnly.FromDateTime(o.ObservationDate);
                    return d.Year == year - 1 && o.IsUsable && o.NdviStats != null;
                })
                .ToList();
            if (prevObs.Count >= 3)
            {
                var prevMean = prevObs.Average(o => o.NdviStats!.Mean);
                if (Math.Abs(prevMean) > 0.001)
                {
                    ndviDelta = (ndviMean.Value - prevMean) / Math.Abs(prevMean) * 100.0;
                }
            }
        }

        var provider = days.Select(d => d.Provider).FirstOrDefault(p => !string.IsNullOrWhiteSpace(p)) ?? "Open-Meteo";

        return new FieldWeatherPeriodReview
        {
            Id = BuildId(fieldId, WeatherPeriodTypes.Year, year, null),
            FieldId = fieldId,
            PeriodType = WeatherPeriodTypes.Year,
            Year = year,
            Month = null,
            OccurredAt = new DateTime(year, 12, 31, 12, 0, 0, DateTimeKind.Utc),
            RainTotalMm = rainTotal,
            MinTemperatureC = mins.Count > 0 ? Math.Round(mins.Min(), 1) : null,
            MaxTemperatureC = maxs.Count > 0 ? Math.Round(maxs.Max(), 1) : null,
            FrostNights = frostNights,
            HeatDays = heatDays,
            HeavyRainDays = heavyRainDays,
            LongestDryStreakDays = dryStreak,
            RainVsPreviousPercent = rainVsPrevious,
            WettestMonth = wettestMonth,
            NdviMean = ndviMean.HasValue ? Math.Round(ndviMean.Value, 3) : null,
            NdviDeltaPercent = ndviDelta.HasValue ? Math.Round(ndviDelta.Value, 1) : null,
            RainSeries = monthlyRain,
            RainLabels = MonthLabels,
            DayCount = days.Count,
            UsableSatelliteCount = obsInYear.Count,
            WeatherProvider = provider,
            SatelliteSource = obsInYear.Count > 0 ? "Sentinel-2" : null,
            CreatedAt = _dateTimeProvider.UtcNow,
            UpdatedAt = _dateTimeProvider.UtcNow
        };
    }

    public static string BuildId(string fieldId, string periodType, int year, int? month) =>
        periodType == WeatherPeriodTypes.Month && month.HasValue
            ? $"{fieldId}_month_{year:D4}{month.Value:D2}"
            : $"{fieldId}_year_{year:D4}";

    private static int LongestDryStreak(IReadOnlyList<FieldDailyWeatherSnapshot> days)
    {
        var longest = 0;
        var current = 0;
        foreach (var day in days.OrderBy(d => d.Date))
        {
            if ((day.RainTotalMm ?? 0) <= DryDayMaxMm)
            {
                current++;
                if (current > longest) longest = current;
            }
            else
            {
                current = 0;
            }
        }

        return longest;
    }

    private static double? RainChangePercent(double currentMm, double previousMm)
    {
        if (previousMm < 5) return null;
        return Math.Round((currentMm - previousMm) / previousMm * 100.0, 0);
    }
}
