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

        var expectedDays = effectiveEnd.DayNumber - monthStart.DayNumber + 1;
        var rainByDay = new double[daysInMonth];
        var labels = new string[daysInMonth];
        for (var d = 1; d <= daysInMonth; d++)
        {
            labels[d - 1] = d.ToString();
            var snap = days.FirstOrDefault(s => s.Date.Day == d);
            // Chart alignment keeps a slot per calendar day; totals below ignore missing measurements.
            rainByDay[d - 1] = snap?.RainTotalMm ?? 0;
        }

        var rainDays = days.Where(s => s.RainTotalMm.HasValue).ToList();
        var mins = days.Where(s => s.MinTemperatureC.HasValue).Select(s => s.MinTemperatureC!.Value).ToList();
        var maxs = days.Where(s => s.MaxTemperatureC.HasValue).Select(s => s.MaxTemperatureC!.Value).ToList();
        var avgs = days.Where(s => s.AverageTemperatureC.HasValue).Select(s => s.AverageTemperatureC!.Value).ToList();
        var heatThreshold = _options.TaskRules.HeatStressTempC;
        var frostNights = days.Count(s => s.MinTemperatureC is <= 0);
        var heatDays = days.Count(s => s.MaxTemperatureC is { } max && max >= heatThreshold);
        var heavyRainDays = rainDays.Count(s => s.RainTotalMm >= HeavyRainMm);
        var dryStreak = LongestDryStreak(rainDays);
        var rainTotal = Math.Round(rainDays.Sum(s => s.RainTotalMm!.Value), 1);
        var rainyDays = rainDays.Count(s => s.RainTotalMm > DryDayMaxMm);
        var dryDays = rainDays.Count(s => s.RainTotalMm <= DryDayMaxMm);
        var et0Days = days.Where(s => s.Et0Mm.HasValue).ToList();
        var et0Total = et0Days.Count > 0 ? Math.Round(et0Days.Sum(s => s.Et0Mm!.Value), 1) : (double?)null;
        var waterBalance = et0Total.HasValue ? Math.Round(rainTotal - et0Total.Value, 1) : (double?)null;
        var humidityDays = days.Where(s => s.AverageHumidityPercent.HasValue).ToList();
        var humidity = humidityDays.Count > 0
            ? Math.Round(humidityDays.Average(s => s.AverageHumidityPercent!.Value), 0)
            : (double?)null;
        var gusts = days.Where(s => s.MaximumWindGustKmh.HasValue).Select(s => s.MaximumWindGustKmh!.Value).ToList();
        var tempMinSeries = new double?[daysInMonth];
        var tempMaxSeries = new double?[daysInMonth];
        for (var d = 1; d <= daysInMonth; d++)
        {
            var snap = days.FirstOrDefault(s => s.Date.Day == d);
            tempMinSeries[d - 1] = snap?.MinTemperatureC;
            tempMaxSeries[d - 1] = snap?.MaxTemperatureC;
        }

        var previousMonth = snapshots
            .Where(s => s.Date.Year == year - 1 && s.Date.Month == month && s.Date <= effectiveEnd)
            .ToList();
        var rainVsPrevious = previousMonth.Count >= MinMonthDays
            ? RainChangePercent(
                rainTotal,
                previousMonth.Where(s => s.RainTotalMm.HasValue).Sum(s => s.RainTotalMm!.Value))
            : null;

        var obsInMonth = observations
            .Where(o =>
            {
                var d = DateOnly.FromDateTime(o.ObservationDate);
                return d.Year == year && d.Month == month && o.IsUsable && o.NdviStats != null;
            })
            .ToList();

        var veg = MeanVegetation(obsInMonth);
        double? ndviDelta = null;
        if (veg.Ndvi.HasValue)
        {
            var prev = monthStart.AddMonths(-1);
            var prevObs = observations
                .Where(o =>
                {
                    var d = DateOnly.FromDateTime(o.ObservationDate);
                    return d.Year == prev.Year && d.Month == prev.Month && o.IsUsable && o.NdviStats != null;
                })
                .ToList();
            ndviDelta = RelativeChangePercent(veg.Ndvi, MeanVegetation(prevObs).Ndvi);
        }

        var (opening, closing) = BookendScenes(observations, monthStart, effectiveEnd);
        var ndviStartEnd = RelativeChangePercent(closing?.NdviMean, opening?.NdviMean);
        var ndmiStartEnd = RelativeChangePercent(closing?.NdmiMean, opening?.NdmiMean);

        var occurredAt = new DateTime(year, month, daysInMonth, 12, 0, 0, DateTimeKind.Utc);
        var provider = days.Select(d => d.Provider).FirstOrDefault(p => !string.IsNullOrWhiteSpace(p)) ?? "Open-Meteo";
        var insights = BuildInsights(
            frostNights,
            heatDays,
            heavyRainDays,
            dryStreak,
            waterBalance,
            rainVsPrevious,
            ndviDelta ?? ndviStartEnd,
            ndmiStartEnd,
            isMonth: true);

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
            AverageTemperatureC = avgs.Count > 0
                ? Math.Round(avgs.Average(), 1)
                : mins.Count > 0 && maxs.Count > 0
                    ? Math.Round((mins.Average() + maxs.Average()) / 2.0, 1)
                    : null,
            FrostNights = frostNights,
            HeatDays = heatDays,
            HeavyRainDays = heavyRainDays,
            LongestDryStreakDays = dryStreak,
            RainyDays = rainyDays,
            DryDays = dryDays,
            Et0TotalMm = et0Total,
            WaterBalanceMm = waterBalance,
            AverageHumidityPercent = humidity,
            MaxWindGustKmh = gusts.Count > 0 ? Math.Round(gusts.Max(), 1) : null,
            RainVsPreviousPercent = rainVsPrevious,
            WettestMonth = null,
            NdviMean = veg.Ndvi,
            NdviDeltaPercent = ndviDelta,
            NdviStartEndDeltaPercent = ndviStartEnd,
            NdmiMean = veg.Ndmi,
            NdreMean = veg.Ndre,
            NdwiMean = veg.Ndwi,
            SaviMean = veg.Savi,
            OpeningScene = opening,
            ClosingScene = closing,
            Insights = insights,
            RainSeries = rainByDay,
            RainLabels = labels,
            TemperatureMinSeries = tempMinSeries,
            TemperatureMaxSeries = tempMaxSeries,
            DayCount = days.Count,
            ExpectedDays = expectedDays,
            DaysWithRainData = rainDays.Count,
            IncludesForecast = false,
            UsableSatelliteCount = obsInMonth.Count,
            WeatherProvider = provider,
            SatelliteSource = opening != null || closing != null || obsInMonth.Count > 0 ? "Sentinel-2" : null,
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

        var expectedDays = effectiveEnd.DayNumber - yearStart.DayNumber + 1;
        var rainDays = days.Where(s => s.RainTotalMm.HasValue).ToList();
        var monthlyRain = new double[12];
        for (var m = 1; m <= 12; m++)
        {
            monthlyRain[m - 1] = Math.Round(
                rainDays.Where(s => s.Date.Month == m).Sum(s => s.RainTotalMm!.Value), 1);
        }

        var heatThreshold = _options.TaskRules.HeatStressTempC;
        var frostNights = days.Count(s => s.MinTemperatureC is <= 0);
        var heatDays = days.Count(s => s.MaxTemperatureC is { } max && max >= heatThreshold);
        var heavyRainDays = rainDays.Count(s => s.RainTotalMm >= HeavyRainMm);
        var dryStreak = LongestDryStreak(rainDays);
        var mins = days.Where(s => s.MinTemperatureC.HasValue).Select(s => s.MinTemperatureC!.Value).ToList();
        var maxs = days.Where(s => s.MaxTemperatureC.HasValue).Select(s => s.MaxTemperatureC!.Value).ToList();
        var avgs = days.Where(s => s.AverageTemperatureC.HasValue).Select(s => s.AverageTemperatureC!.Value).ToList();
        var rainTotal = Math.Round(rainDays.Sum(s => s.RainTotalMm!.Value), 1);
        var rainyDays = rainDays.Count(s => s.RainTotalMm > DryDayMaxMm);
        var dryDays = rainDays.Count(s => s.RainTotalMm <= DryDayMaxMm);
        var et0Days = days.Where(s => s.Et0Mm.HasValue).ToList();
        var et0Total = et0Days.Count > 0 ? Math.Round(et0Days.Sum(s => s.Et0Mm!.Value), 1) : (double?)null;
        var waterBalance = et0Total.HasValue ? Math.Round(rainTotal - et0Total.Value, 1) : (double?)null;
        var humidityDays = days.Where(s => s.AverageHumidityPercent.HasValue).ToList();
        var humidity = humidityDays.Count > 0
            ? Math.Round(humidityDays.Average(s => s.AverageHumidityPercent!.Value), 0)
            : (double?)null;
        var gusts = days.Where(s => s.MaximumWindGustKmh.HasValue).Select(s => s.MaximumWindGustKmh!.Value).ToList();
        var previousYear = snapshots.Where(s => s.Date.Year == year - 1 && s.Date <= effectiveEnd).ToList();
        var rainVsPrevious = previousYear.Count >= MinYearDays
            ? RainChangePercent(
                rainTotal,
                previousYear.Where(s => s.RainTotalMm.HasValue).Sum(s => s.RainTotalMm!.Value))
            : null;

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

        var veg = obsInYear.Count >= 3 ? MeanVegetation(obsInYear) : default;
        double? ndviDelta = null;
        if (veg.Ndvi.HasValue)
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
                ndviDelta = RelativeChangePercent(veg.Ndvi, MeanVegetation(prevObs).Ndvi);
            }
        }

        var (opening, closing) = BookendScenes(observations, yearStart, effectiveEnd);
        var ndviStartEnd = RelativeChangePercent(closing?.NdviMean, opening?.NdviMean);
        var ndmiStartEnd = RelativeChangePercent(closing?.NdmiMean, opening?.NdmiMean);
        var provider = days.Select(d => d.Provider).FirstOrDefault(p => !string.IsNullOrWhiteSpace(p)) ?? "Open-Meteo";
        var insights = BuildInsights(
            frostNights,
            heatDays,
            heavyRainDays,
            dryStreak,
            waterBalance,
            rainVsPrevious,
            ndviDelta ?? ndviStartEnd,
            ndmiStartEnd,
            isMonth: false);

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
            AverageTemperatureC = avgs.Count > 0
                ? Math.Round(avgs.Average(), 1)
                : mins.Count > 0 && maxs.Count > 0
                    ? Math.Round((mins.Average() + maxs.Average()) / 2.0, 1)
                    : null,
            FrostNights = frostNights,
            HeatDays = heatDays,
            HeavyRainDays = heavyRainDays,
            LongestDryStreakDays = dryStreak,
            RainyDays = rainyDays,
            DryDays = dryDays,
            Et0TotalMm = et0Total,
            WaterBalanceMm = waterBalance,
            AverageHumidityPercent = humidity,
            MaxWindGustKmh = gusts.Count > 0 ? Math.Round(gusts.Max(), 1) : null,
            RainVsPreviousPercent = rainVsPrevious,
            WettestMonth = wettestMonth,
            NdviMean = veg.Ndvi,
            NdviDeltaPercent = ndviDelta,
            NdviStartEndDeltaPercent = ndviStartEnd,
            NdmiMean = veg.Ndmi,
            NdreMean = veg.Ndre,
            NdwiMean = veg.Ndwi,
            SaviMean = veg.Savi,
            OpeningScene = opening,
            ClosingScene = closing,
            Insights = insights,
            RainSeries = monthlyRain,
            RainLabels = MonthLabels,
            DayCount = days.Count,
            ExpectedDays = expectedDays,
            DaysWithRainData = rainDays.Count,
            IncludesForecast = false,
            UsableSatelliteCount = obsInYear.Count,
            WeatherProvider = provider,
            SatelliteSource = opening != null || closing != null || obsInYear.Count > 0 ? "Sentinel-2" : null,
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
            if (!day.RainTotalMm.HasValue)
            {
                current = 0;
                continue;
            }

            if (day.RainTotalMm.Value <= DryDayMaxMm)
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

    private static double? RelativeChangePercent(double? current, double? previous)
    {
        if (!current.HasValue || !previous.HasValue || Math.Abs(previous.Value) < 0.001)
        {
            return null;
        }

        return Math.Round((current.Value - previous.Value) / Math.Abs(previous.Value) * 100.0, 1);
    }

    private static (WeatherReviewSatelliteScene? Opening, WeatherReviewSatelliteScene? Closing) BookendScenes(
        IReadOnlyList<FieldSatelliteObservation> observations,
        DateOnly periodStart,
        DateOnly periodEnd)
    {
        var usable = observations
            .Where(o => o.IsUsable)
            .OrderBy(o => o.ObservationDate)
            .ToList();

        var startDt = periodStart.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endDt = periodEnd.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
        var inPeriod = usable.Where(o => o.ObservationDate >= startDt && o.ObservationDate <= endDt).ToList();
        var before = usable.Where(o => o.ObservationDate < startDt).ToList();

        var closingObs = inPeriod.LastOrDefault();
        var openingObs = before.LastOrDefault() ?? inPeriod.FirstOrDefault();
        if (openingObs != null && closingObs != null && openingObs.Id == closingObs.Id && before.Count == 0)
        {
            openingObs = null;
        }

        return (
            openingObs == null ? null : ToScene(openingObs, "opening"),
            closingObs == null ? null : ToScene(closingObs, "closing"));
    }

    private static WeatherReviewSatelliteScene ToScene(FieldSatelliteObservation observation, string role) =>
        new()
        {
            ObservationId = observation.Id,
            ObservationDate = observation.ObservationDate,
            Role = role,
            TrueColorPath = observation.TrueColorStoragePath,
            NdviPath = observation.NdviStoragePath,
            NdviMean = observation.NdviStats == null ? null : Math.Round(observation.NdviStats.Mean, 3),
            NdmiMean = observation.NdmiStats == null ? null : Math.Round(observation.NdmiStats.Mean, 3),
            CloudCoverPercent = observation.FieldCloudCoverPercent ?? observation.CloudCoverPercent
        };

    private static VegetationMeans MeanVegetation(IReadOnlyList<FieldSatelliteObservation> observations)
    {
        if (observations.Count == 0) return default;
        return new VegetationMeans(
            RoundMean(observations.Select(o => o.NdviStats?.Mean)),
            RoundMean(observations.Select(o => o.NdmiStats?.Mean)),
            RoundMean(observations.Select(o => o.NdreStats?.Mean)),
            RoundMean(observations.Select(o => o.NdwiStats?.Mean)),
            RoundMean(observations.Select(o => o.SaviStats?.Mean)));
    }

    private static double? RoundMean(IEnumerable<double?> values)
    {
        var present = values.Where(v => v.HasValue).Select(v => v!.Value).ToList();
        return present.Count == 0 ? null : Math.Round(present.Average(), 3);
    }

    private static IReadOnlyList<WeatherPeriodInsight> BuildInsights(
        int frostNights,
        int heatDays,
        int heavyRainDays,
        int dryStreak,
        double? waterBalanceMm,
        double? rainVsPrevious,
        double? ndviDelta,
        double? ndmiDelta,
        bool isMonth)
    {
        var insights = new List<WeatherPeriodInsight>();
        if (frostNights > 0)
        {
            insights.Add(new WeatherPeriodInsight
            {
                Kind = WeatherInsightKinds.Frost,
                Severity = frostNights >= (isMonth ? 3 : 12) ? WeatherInsightSeverity.Alert : WeatherInsightSeverity.Watch
            });
        }

        if (heatDays > 0)
        {
            insights.Add(new WeatherPeriodInsight
            {
                Kind = WeatherInsightKinds.Heat,
                Severity = heatDays >= (isMonth ? 5 : 20) ? WeatherInsightSeverity.Alert : WeatherInsightSeverity.Watch
            });
        }

        if (heavyRainDays > 0)
        {
            insights.Add(new WeatherPeriodInsight
            {
                Kind = WeatherInsightKinds.HeavyRain,
                Severity = heavyRainDays >= 3 ? WeatherInsightSeverity.Watch : WeatherInsightSeverity.Info
            });
        }

        if (dryStreak >= 10)
        {
            insights.Add(new WeatherPeriodInsight
            {
                Kind = WeatherInsightKinds.Dry,
                Severity = dryStreak >= 18 ? WeatherInsightSeverity.Alert : WeatherInsightSeverity.Watch
            });
        }

        if (waterBalanceMm is < -30)
        {
            insights.Add(new WeatherPeriodInsight
            {
                Kind = WeatherInsightKinds.WaterDeficit,
                Severity = waterBalanceMm < -80 ? WeatherInsightSeverity.Alert : WeatherInsightSeverity.Watch
            });
        }
        else if (waterBalanceMm is > 40)
        {
            insights.Add(new WeatherPeriodInsight
            {
                Kind = WeatherInsightKinds.WaterSurplus,
                Severity = WeatherInsightSeverity.Info
            });
        }

        if (rainVsPrevious is >= 15)
        {
            insights.Add(new WeatherPeriodInsight { Kind = WeatherInsightKinds.Wetter, Severity = WeatherInsightSeverity.Info });
        }
        else if (rainVsPrevious is <= -15)
        {
            insights.Add(new WeatherPeriodInsight { Kind = WeatherInsightKinds.Drier, Severity = WeatherInsightSeverity.Watch });
        }

        if (ndviDelta is >= 5)
        {
            insights.Add(new WeatherPeriodInsight { Kind = WeatherInsightKinds.Greener, Severity = WeatherInsightSeverity.Info });
        }
        else if (ndviDelta is <= -5)
        {
            insights.Add(new WeatherPeriodInsight { Kind = WeatherInsightKinds.Browner, Severity = WeatherInsightSeverity.Watch });
        }

        if (ndmiDelta is >= 8)
        {
            insights.Add(new WeatherPeriodInsight { Kind = WeatherInsightKinds.MoistureUp, Severity = WeatherInsightSeverity.Info });
        }
        else if (ndmiDelta is <= -8)
        {
            insights.Add(new WeatherPeriodInsight { Kind = WeatherInsightKinds.MoistureDown, Severity = WeatherInsightSeverity.Watch });
        }

        return insights;
    }

    private readonly record struct VegetationMeans(
        double? Ndvi,
        double? Ndmi,
        double? Ndre,
        double? Ndwi,
        double? Savi);
}
