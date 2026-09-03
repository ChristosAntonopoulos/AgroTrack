using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.ValueObjects;
using Xunit;

namespace OliveLifecycle.Application.Tests.Geospatial;

public class WeatherIntelligenceServiceTests
{
    private static readonly DateTime Now = new(2026, 3, 15, 12, 0, 0, DateTimeKind.Utc);

    private readonly Mock<IWeatherProvider> _weatherProvider = new();
    private readonly Mock<IWeatherCacheRepository> _cacheRepository = new();
    private readonly Mock<IFieldDailyWeatherSnapshotRepository> _snapshotRepository = new();
    private readonly Mock<ITaskRepository> _taskRepository = new();
    private readonly Mock<IDateTimeProvider> _dateTimeProvider = new();
    private readonly GeospatialOptions _options = new();

    public WeatherIntelligenceServiceTests()
    {
        _dateTimeProvider.SetupGet(d => d.UtcNow).Returns(Now);
        _weatherProvider.SetupGet(p => p.ProviderName).Returns("Open-Meteo");
        _taskRepository.Setup(r => r.GetByFieldIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TaskItem>());
        _cacheRepository.Setup(r => r.UpsertAsync(It.IsAny<WeatherCacheLocation>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((WeatherCacheLocation l, CancellationToken _) => l);
        _snapshotRepository.Setup(r => r.UpsertAsync(It.IsAny<FieldDailyWeatherSnapshot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldDailyWeatherSnapshot s, CancellationToken _) => s);
        _snapshotRepository.Setup(r => r.UpsertManyAsync(It.IsAny<IReadOnlyList<FieldDailyWeatherSnapshot>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<FieldDailyWeatherSnapshot> list, CancellationToken _) => list.Count);
        _snapshotRepository.Setup(r => r.GetHistoryAsync(It.IsAny<string>(), It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FieldDailyWeatherSnapshot>());
    }

    private WeatherIntelligenceService CreateService() => new(
        _weatherProvider.Object,
        _cacheRepository.Object,
        _snapshotRepository.Object,
        _taskRepository.Object,
        _dateTimeProvider.Object,
        Options.Create(_options),
        NullLogger<WeatherIntelligenceService>.Instance);

    private static Field CreateField() => new()
    {
        Id = "field-1",
        OwnerId = "owner-1",
        CenterPoint = new GeoJsonPoint { Coordinates = [23.7275, 37.9838] }
    };

    /// <summary>Hourly series spanning 48 h of history and 48 h of forecast.</summary>
    private static List<HourlyForecastEntry> BuildSeries(Func<int, HourlyForecastEntry> factory, int fromHour = -48, int toHour = 48)
    {
        var entries = new List<HourlyForecastEntry>();
        for (var offset = fromHour; offset <= toHour; offset++)
        {
            entries.Add(factory(offset));
        }
        return entries;
    }

    private WeatherCacheLocation CreateCache(List<HourlyForecastEntry> hourly) => new()
    {
        Id = "cache-1",
        GridKey = "37.98,23.73",
        Latitude = 37.9838,
        Longitude = 23.7275,
        Provider = "Open-Meteo",
        Model = "best_match",
        FetchedAt = Now.AddMinutes(-5),
        HourlyForecast = hourly
    };

    [Fact]
    public void ComputeGridKey_RoundsToConfiguredPrecision()
    {
        var service = CreateService();

        Assert.Equal("37.98,23.73", service.ComputeGridKey(37.98376, 23.72751));
    }

    [Fact]
    public void ComputeGridKey_GroupsNearbyFieldsIntoOneCall()
    {
        var service = CreateService();

        // ~200 m apart: both fields should share the same forecast grid cell.
        Assert.Equal(service.ComputeGridKey(37.9838, 23.7275), service.ComputeGridKey(37.9841, 23.7277));
    }

    [Fact]
    public async Task GetFieldWeatherAsync_UsesCache_WhenFresh()
    {
        var hourly = BuildSeries(offset => new HourlyForecastEntry
        {
            Time = Now.AddHours(offset),
            TemperatureC = 18,
            HumidityPercent = 60,
            WindSpeedKmh = 10,
            WeatherCode = 0
        });
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCache(hourly));

        var result = await CreateService().GetFieldWeatherAsync(CreateField());

        Assert.False(result.Stale);
        Assert.Equal(18, result.Current!.TemperatureC);
        _weatherProvider.Verify(p => p.FetchForecastAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetFieldWeatherAsync_ReturnsStaleCache_WhenProviderFails()
    {
        var hourly = BuildSeries(offset => new HourlyForecastEntry { Time = Now.AddHours(offset), TemperatureC = 12 });
        var cache = CreateCache(hourly);
        cache.FetchedAt = Now.AddHours(-6);
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(cache);
        _weatherProvider.Setup(p => p.FetchForecastAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("provider down"));

        var result = await CreateService().GetFieldWeatherAsync(CreateField());

        Assert.True(result.Stale);
        Assert.Equal(12, result.Current!.TemperatureC);
        Assert.Equal(cache.FetchedAt, result.LastUpdatedAt);
    }

    [Fact]
    public async Task GetFieldWeatherAsync_DegradesGracefully_WhenNoCacheAndProviderFails()
    {
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((WeatherCacheLocation?)null);
        _weatherProvider.Setup(p => p.FetchForecastAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("provider down"));

        var result = await CreateService().GetFieldWeatherAsync(CreateField());

        Assert.True(result.Stale);
        Assert.Null(result.Current);
        Assert.Equal("Open-Meteo", result.Metadata.Source);
    }

    [Theory]
    [InlineData(-1.0, "Critical")]
    [InlineData(0.5, "High")]
    [InlineData(1.8, "Moderate")]
    [InlineData(3.5, "Low")]
    [InlineData(8.0, "None")]
    public async Task GetFieldWeatherAsync_ClassifiesFrostRiskFromForecastMinimum(double overnightMin, string expectedLevel)
    {
        var hourly = BuildSeries(offset => new HourlyForecastEntry
        {
            Time = Now.AddHours(offset),
            // Only the coming night dips; history stays mild so it cannot influence the result.
            TemperatureC = offset is >= 12 and <= 16 ? overnightMin : 15
        });
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCache(hourly));

        var result = await CreateService().GetFieldWeatherAsync(CreateField());

        Assert.Equal(expectedLevel, result.Frost.Level);
        Assert.Equal(overnightMin, result.Frost.ForecastMinTempC);
    }

    [Fact]
    public async Task GetFieldWeatherAsync_FrostWindowIsOnlySetWhenRiskExists()
    {
        var hourly = BuildSeries(offset => new HourlyForecastEntry { Time = Now.AddHours(offset), TemperatureC = 20 });
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCache(hourly));

        var result = await CreateService().GetFieldWeatherAsync(CreateField());

        Assert.Equal("None", result.Frost.Level);
        Assert.Null(result.Frost.Window);
    }

    [Fact]
    public async Task GetFieldWeatherAsync_SplitsRainIntoPastAndForecastWindows()
    {
        // 1 mm in each of the last 24 h, 2 mm in each of the next 24 h.
        var hourly = BuildSeries(offset => new HourlyForecastEntry
        {
            Time = Now.AddHours(offset),
            RainMm = offset switch
            {
                >= -24 and < 0 => 1,
                > 0 and <= 24 => 2,
                _ => 0
            }
        });
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCache(hourly));

        var result = await CreateService().GetFieldWeatherAsync(CreateField());

        // Past windows are exclusive at the far edge: 23 hourly buckets of 1 mm.
        Assert.Equal(23, result.Rain.Previous24hMm);
        Assert.Equal(6, result.Rain.Forecast3hMm);
        Assert.Equal(48, result.Rain.Forecast24hMm);
        Assert.Equal(48, result.Rain.Forecast48hMm);
    }

    [Fact]
    public async Task GetFieldWeatherAsync_ReportsMaximumGustPerForecastWindow()
    {
        var hourly = BuildSeries(offset => new HourlyForecastEntry
        {
            Time = Now.AddHours(offset),
            WindSpeedKmh = 12,
            WindGustKmh = offset switch
            {
                <= 0 => 15,
                <= 6 => 30,
                <= 12 => 45,
                _ => 60
            },
            WindDirectionDegrees = 90
        });
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCache(hourly));

        var result = await CreateService().GetFieldWeatherAsync(CreateField());

        Assert.Equal(12, result.Wind.CurrentSpeedKmh);
        Assert.Equal(30, result.Wind.MaxNext6hKmh);
        Assert.Equal(45, result.Wind.MaxNext12hKmh);
        Assert.Equal(60, result.Wind.MaxNext24hKmh);
        Assert.Equal("E", result.Wind.DominantDirection);
    }

    [Fact]
    public async Task GetFieldWeatherAsync_WaterBalanceCountsRainIrrigationAndEt0()
    {
        var hourly = BuildSeries(offset => new HourlyForecastEntry
        {
            Time = Now.AddHours(offset),
            RainMm = offset < 0 ? 0.5 : 0,
            Et0Mm = offset < 0 ? 0.1 : 0
        }, fromHour: -168, toHour: 24);
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCache(hourly));
        _taskRepository.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TaskItem>
            {
                new() { Id = "t1", Type = "Irrigation", Status = WorkTaskStatus.Completed, ActualEnd = Now.AddDays(-2) },
                // Excluded: outside the 7-day window and not completed.
                new() { Id = "t2", Type = "Irrigation", Status = WorkTaskStatus.Completed, ActualEnd = Now.AddDays(-30) },
                new() { Id = "t3", Type = "Irrigation", Status = WorkTaskStatus.Pending, ActualEnd = Now.AddDays(-1) },
                new() { Id = "t4", Type = "Pruning", Status = WorkTaskStatus.Completed, ActualEnd = Now.AddDays(-1) }
            });

        var result = await CreateService().GetFieldWeatherAsync(CreateField());

        Assert.Equal(83.5, result.WaterBalance.RainMm);
        Assert.Equal(16.7, result.WaterBalance.Et0Mm);
        Assert.Equal(10, result.WaterBalance.IrrigationMm);
        Assert.Equal(76.8, result.WaterBalance.BalanceMm);
        Assert.Equal("Wet", result.WaterBalance.Label);
    }

    [Fact]
    public async Task GetFieldWeatherAsync_LabelsDeficitAsDry()
    {
        var hourly = BuildSeries(offset => new HourlyForecastEntry
        {
            Time = Now.AddHours(offset),
            RainMm = 0,
            Et0Mm = offset < 0 ? 0.2 : 0
        }, fromHour: -168, toHour: 24);
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCache(hourly));

        var result = await CreateService().GetFieldWeatherAsync(CreateField());

        Assert.Equal("Dry", result.WaterBalance.Label);
        Assert.True(result.WaterBalance.BalanceMm < 0);
    }

    [Fact]
    public async Task GetFieldWeatherAsync_AlwaysReportsSourceAndResolution()
    {
        var hourly = BuildSeries(offset => new HourlyForecastEntry { Time = Now.AddHours(offset), TemperatureC = 20 });
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCache(hourly));

        var result = await CreateService().GetFieldWeatherAsync(CreateField());

        Assert.Equal("Open-Meteo", result.Metadata.Source);
        Assert.Equal("~1-11 km", result.Metadata.SpatialResolution);
        Assert.Equal("modelled", result.Metadata.ValueType);
        Assert.Equal("Weather data by Open-Meteo.com", result.Metadata.Attribution);
    }

    [Fact]
    public async Task GetFieldWeatherAsync_FallsBackToLegacyLocation_WhenNoCenterPoint()
    {
        var hourly = BuildSeries(offset => new HourlyForecastEntry { Time = Now.AddHours(offset), TemperatureC = 20 });
        _cacheRepository.Setup(r => r.GetByGridKeyAsync("37.98,23.73", It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCache(hourly));
        var field = new Field { Id = "field-1", Location = new Location { Latitude = 37.9838, Longitude = 23.7275 } };

        var result = await CreateService().GetFieldWeatherAsync(field);

        Assert.NotNull(result.Current);
    }

    [Fact]
    public async Task CreateDailySnapshotAsync_IsIdempotent()
    {
        var existing = new FieldDailyWeatherSnapshot { Id = "field-1_20260314", FieldId = "field-1" };
        _snapshotRepository.Setup(r => r.GetByFieldAndDateAsync("field-1", It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var result = await CreateService().CreateDailySnapshotAsync(CreateField(), new DateOnly(2026, 3, 14));

        Assert.Same(existing, result);
        _snapshotRepository.Verify(r => r.UpsertAsync(It.IsAny<FieldDailyWeatherSnapshot>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateDailySnapshotAsync_AggregatesTheRequestedDayOnly()
    {
        var date = new DateOnly(2026, 3, 14);
        var hourly = BuildSeries(offset => new HourlyForecastEntry
        {
            Time = Now.AddHours(offset),
            TemperatureC = DateOnly.FromDateTime(Now.AddHours(offset)) == date ? 10 + offset % 5 : 30,
            RainMm = DateOnly.FromDateTime(Now.AddHours(offset)) == date ? 0.5 : 5,
            Et0Mm = 0.1,
            WindSpeedKmh = 8
        }, fromHour: -48, toHour: 24);
        _snapshotRepository.Setup(r => r.GetByFieldAndDateAsync("field-1", date, It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldDailyWeatherSnapshot?)null);
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCache(hourly));

        var result = await CreateService().CreateDailySnapshotAsync(CreateField(), date);

        Assert.NotNull(result);
        Assert.Equal("field-1_20260314", result!.Id);
        Assert.Equal(date, result.Date);
        Assert.Equal(12, result.RainTotalMm);
        Assert.True(result.MaxTemperatureC < 30);
        Assert.Equal(8, result.AverageWindSpeedKmh);
    }

    [Fact]
    public async Task CreateDailySnapshotAsync_ReturnsNull_WhenDayOutsideProviderWindow()
    {
        var hourly = BuildSeries(offset => new HourlyForecastEntry { Time = Now.AddHours(offset), TemperatureC = 20 });
        _snapshotRepository.Setup(r => r.GetByFieldAndDateAsync("field-1", It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldDailyWeatherSnapshot?)null);
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateCache(hourly));

        var result = await CreateService().CreateDailySnapshotAsync(CreateField(), new DateOnly(2020, 1, 1));

        Assert.Null(result);
        _snapshotRepository.Verify(r => r.UpsertAsync(It.IsAny<FieldDailyWeatherSnapshot>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RefreshLocationAsync_UpdatesExistingCacheEntryInPlace()
    {
        var existing = CreateCache([]);
        existing.FetchedAt = Now.AddHours(-10);
        _cacheRepository.Setup(r => r.GetByGridKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _weatherProvider.Setup(p => p.FetchForecastAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WeatherForecastResult
            {
                Provider = "Open-Meteo",
                Model = "best_match",
                FetchedAt = Now,
                HourlyForecast = [new HourlyForecastEntry { Time = Now, TemperatureC = 21 }]
            });

        var result = await CreateService().RefreshLocationAsync(37.9838, 23.7275);

        Assert.Equal("cache-1", result.Id);
        Assert.Equal(Now, result.FetchedAt);
        Assert.Single(result.HourlyForecast);
    }

    [Fact]
    public async Task BackfillHistoryAsync_WritesMissingArchiveDays()
    {
        _weatherProvider.Setup(p => p.FetchArchiveDailyAsync(
                It.IsAny<double>(), It.IsAny<double>(), It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WeatherArchiveResult
            {
                Provider = "Open-Meteo",
                Model = "era5_seamless",
                Days =
                [
                    new DailyWeatherArchiveDay { Date = new DateOnly(2025, 3, 1), RainTotalMm = 2, MinTemperatureC = 8, MaxTemperatureC = 16 },
                    new DailyWeatherArchiveDay { Date = new DateOnly(2025, 3, 2), RainTotalMm = 0, MinTemperatureC = 9, MaxTemperatureC = 18 }
                ]
            });

        var written = await CreateService().BackfillHistoryAsync(CreateField());

        Assert.Equal(2, written);
        _snapshotRepository.Verify(r => r.UpsertManyAsync(
            It.Is<IReadOnlyList<FieldDailyWeatherSnapshot>>(list =>
                list.Count == 2 &&
                list.All(s => s.FieldId == "field-1") &&
                list.Any(s => s.Date == new DateOnly(2025, 3, 1) && s.RainTotalMm == 2)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task BackfillHistoryAsync_SkipsDaysThatAlreadyExist()
    {
        _snapshotRepository.Setup(r => r.GetHistoryAsync(It.IsAny<string>(), It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new FieldDailyWeatherSnapshot { Date = new DateOnly(2025, 3, 1) }]);
        _weatherProvider.Setup(p => p.FetchArchiveDailyAsync(
                It.IsAny<double>(), It.IsAny<double>(), It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WeatherArchiveResult
            {
                Days =
                [
                    new DailyWeatherArchiveDay { Date = new DateOnly(2025, 3, 1), RainTotalMm = 4 },
                    new DailyWeatherArchiveDay { Date = new DateOnly(2025, 3, 2), RainTotalMm = 1 }
                ]
            });

        var written = await CreateService().BackfillHistoryAsync(CreateField());

        Assert.Equal(1, written);
        _snapshotRepository.Verify(r => r.UpsertManyAsync(
            It.Is<IReadOnlyList<FieldDailyWeatherSnapshot>>(list => list.Count == 1 && list[0].Date == new DateOnly(2025, 3, 2)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task BackfillHistoryAsync_DoesNothing_WhenHistoryYearsIsZero()
    {
        _options.Weather.HistoryYears = 0;

        var written = await CreateService().BackfillHistoryAsync(CreateField());

        Assert.Equal(0, written);
        _weatherProvider.Verify(
            p => p.FetchArchiveDailyAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
