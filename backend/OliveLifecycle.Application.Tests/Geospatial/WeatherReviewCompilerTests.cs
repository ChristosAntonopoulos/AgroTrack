using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Core.Entities.Geospatial;
using Xunit;

namespace OliveLifecycle.Application.Tests.Geospatial;

public class WeatherReviewCompilerTests
{
    private static readonly DateTime Now = new(2026, 3, 15, 12, 0, 0, DateTimeKind.Utc);

    private readonly Mock<IFieldDailyWeatherSnapshotRepository> _snapshots = new();
    private readonly Mock<IFieldSatelliteObservationRepository> _satellite = new();
    private readonly Mock<IFieldWeatherPeriodReviewRepository> _reviews = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly GeospatialOptions _options = new();
    private readonly WeatherReviewCompiler _compiler;

    public WeatherReviewCompilerTests()
    {
        _clock.SetupGet(c => c.UtcNow).Returns(Now);
        _options.Weather.HistoryYears = 3;
        _options.TaskRules.HeatStressTempC = 35;

        _compiler = new WeatherReviewCompiler(
            _snapshots.Object,
            _satellite.Object,
            _reviews.Object,
            _clock.Object,
            Options.Create(_options),
            NullLogger<WeatherReviewCompiler>.Instance);
    }

    [Fact]
    public void BuildMonthReview_SumsRainAndCountsFrost()
    {
        var days = BuildMonthDays(2025, 1, day => new FieldDailyWeatherSnapshot
        {
            FieldId = "f1",
            Date = day,
            RainTotalMm = 2,
            MinTemperatureC = day.Day <= 3 ? -1 : 5,
            MaxTemperatureC = 12,
            Provider = "Open-Meteo"
        });

        var review = _compiler.BuildMonthReview("f1", 2025, 1, days, Array.Empty<FieldSatelliteObservation>(), DateOnly.FromDateTime(Now));

        Assert.NotNull(review);
        Assert.Equal(WeatherPeriodTypes.Month, review!.PeriodType);
        Assert.Equal(62, review.RainTotalMm); // 31 * 2
        Assert.Equal(3, review.FrostNights);
        Assert.Equal(31, review.RainSeries.Count);
        Assert.Equal("f1_month_202501", review.Id);
    }

    [Fact]
    public void BuildMonthReview_SkipsIncompleteMonth()
    {
        var days = Enumerable.Range(1, 10).Select(d => new FieldDailyWeatherSnapshot
        {
            FieldId = "f1",
            Date = new DateOnly(2025, 2, d),
            RainTotalMm = 1,
            MinTemperatureC = 4,
            MaxTemperatureC = 14,
            Provider = "Open-Meteo"
        }).ToList();

        var review = _compiler.BuildMonthReview("f1", 2025, 2, days, Array.Empty<FieldSatelliteObservation>(), DateOnly.FromDateTime(Now));
        Assert.Null(review);
    }

    [Fact]
    public void BuildMonthReview_IgnoresUnusableSatellite()
    {
        var days = BuildMonthDays(2025, 3, day => new FieldDailyWeatherSnapshot
        {
            FieldId = "f1",
            Date = day,
            RainTotalMm = 1,
            MinTemperatureC = 8,
            MaxTemperatureC = 18,
            Provider = "Open-Meteo"
        });

        var observations = new List<FieldSatelliteObservation>
        {
            new()
            {
                FieldId = "f1",
                ObservationDate = new DateTime(2025, 3, 10, 0, 0, 0, DateTimeKind.Utc),
                IsUsable = false,
                NdviStats = new VegetationIndexStats { Mean = 0.9 }
            },
            new()
            {
                FieldId = "f1",
                ObservationDate = new DateTime(2025, 3, 20, 0, 0, 0, DateTimeKind.Utc),
                IsUsable = true,
                NdviStats = new VegetationIndexStats { Mean = 0.55 }
            }
        };

        var review = _compiler.BuildMonthReview("f1", 2025, 3, days, observations, DateOnly.FromDateTime(Now));

        Assert.NotNull(review);
        Assert.Equal(1, review!.UsableSatelliteCount);
        Assert.Equal(0.55, review.NdviMean);
    }

    [Fact]
    public void BuildYearReview_BuildsTwelveMonthlyBars()
    {
        var days = new List<FieldDailyWeatherSnapshot>();
        for (var m = 1; m <= 12; m++)
        {
            var daysInMonth = DateTime.DaysInMonth(2024, m);
            for (var d = 1; d <= daysInMonth; d++)
            {
                days.Add(new FieldDailyWeatherSnapshot
                {
                    FieldId = "f1",
                    Date = new DateOnly(2024, m, d),
                    RainTotalMm = 1,
                    MinTemperatureC = m == 1 && d <= 2 ? -2 : 10,
                    MaxTemperatureC = 20,
                    Provider = "Open-Meteo"
                });
            }
        }

        var review = _compiler.BuildYearReview("f1", 2024, days, Array.Empty<FieldSatelliteObservation>(), DateOnly.FromDateTime(Now));

        Assert.NotNull(review);
        Assert.Equal(WeatherPeriodTypes.Year, review!.PeriodType);
        Assert.Equal(12, review.RainSeries.Count);
        Assert.Equal(2, review.FrostNights);
        Assert.Equal("f1_year_2024", review.Id);
        Assert.Equal(366, review.DayCount); // 2024 leap year
    }

    [Fact]
    public async Task RebuildForFieldAsync_UpsertsCompiledReviews()
    {
        var days = BuildMonthDays(2025, 1, day => new FieldDailyWeatherSnapshot
        {
            FieldId = "f1",
            Date = day,
            RainTotalMm = 3,
            MinTemperatureC = 2,
            MaxTemperatureC = 14,
            Provider = "Open-Meteo"
        });

        // Also fill enough of 2025 for current-year proportional threshold (Now is Mar 15).
        for (var m = 2; m <= 3; m++)
        {
            var endDay = m == 3 ? 14 : DateTime.DaysInMonth(2025, m);
            for (var d = 1; d <= endDay; d++)
            {
                days.Add(new FieldDailyWeatherSnapshot
                {
                    FieldId = "f1",
                    Date = new DateOnly(2025, m, d),
                    RainTotalMm = 1,
                    MinTemperatureC = 5,
                    MaxTemperatureC = 16,
                    Provider = "Open-Meteo"
                });
            }
        }

        _snapshots.Setup(r => r.GetHistoryAsync("f1", It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(days);
        _satellite.Setup(r => r.GetUsableInRangeAsync("f1", It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldSatelliteObservation>());
        _reviews.Setup(r => r.UpsertManyAsync(It.IsAny<IReadOnlyList<FieldWeatherPeriodReview>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<FieldWeatherPeriodReview> list, CancellationToken _) => list.Count);

        var written = await _compiler.RebuildForFieldAsync("f1");

        Assert.True(written >= 1);
        _reviews.Verify(r => r.UpsertManyAsync(
            It.Is<IReadOnlyList<FieldWeatherPeriodReview>>(list =>
                list.Any(x => x.Id == "f1_month_202501")),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public void BuildMonthReview_CountsHeavyRainAndDryStreak()
    {
        var days = new List<FieldDailyWeatherSnapshot>();
        for (var d = 1; d <= 28; d++)
        {
            days.Add(new FieldDailyWeatherSnapshot
            {
                FieldId = "f1",
                Date = new DateOnly(2025, 2, d),
                RainTotalMm = d <= 5 ? 0 : d == 10 || d == 11 ? 25 : 1,
                MinTemperatureC = 4,
                MaxTemperatureC = 14,
                Provider = "Open-Meteo"
            });
        }

        for (var d = 1; d <= 28; d++)
        {
            days.Add(new FieldDailyWeatherSnapshot
            {
                FieldId = "f1",
                Date = new DateOnly(2024, 2, d),
                RainTotalMm = 2,
                MinTemperatureC = 4,
                MaxTemperatureC = 14,
                Provider = "Open-Meteo"
            });
        }

        var review = _compiler.BuildMonthReview(
            "f1", 2025, 2, days, Array.Empty<FieldSatelliteObservation>(), DateOnly.FromDateTime(Now));

        Assert.NotNull(review);
        Assert.Equal(2, review!.HeavyRainDays);
        Assert.Equal(5, review.LongestDryStreakDays);
        Assert.NotNull(review.RainVsPreviousPercent);
    }

    private static List<FieldDailyWeatherSnapshot> BuildMonthDays(
        int year,
        int month,
        Func<DateOnly, FieldDailyWeatherSnapshot> factory)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);
        return Enumerable.Range(1, daysInMonth)
            .Select(d => factory(new DateOnly(year, month, d)))
            .ToList();
    }
}
