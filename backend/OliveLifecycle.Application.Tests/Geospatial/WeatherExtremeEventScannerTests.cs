using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Core.Entities.Geospatial;
using Xunit;

namespace OliveLifecycle.Application.Tests.Geospatial;

public class WeatherExtremeEventScannerTests
{
    private static readonly ExtremeWeatherOptions Opts = new();
    private static readonly DateTime Now = new(2026, 9, 24, 12, 0, 0, DateTimeKind.Utc);

    private static FieldDailyWeatherSnapshot Day(
        int y, int m, int d,
        double? min = null,
        double? max = null,
        double? rain = null) => new()
    {
        FieldId = "f1",
        Date = new DateOnly(y, m, d),
        MinTemperatureC = min,
        MaxTemperatureC = max,
        RainTotalMm = rain,
        Provider = "Open-Meteo"
    };

    [Fact]
    public void DetectHeatwaves_RequiresThreeConsecutiveDaysAt37()
    {
        var days = new[]
        {
            Day(2026, 7, 1, max: 36),
            Day(2026, 7, 2, max: 37),
            Day(2026, 7, 3, max: 38),
            Day(2026, 7, 4, max: 39),
            Day(2026, 7, 5, max: 36),
        };

        var events = WeatherExtremeEventScanner.DetectHeatwaves("f1", days, Opts, Now).ToList();
        Assert.Single(events);
        Assert.Equal(WeatherExtremeKinds.Heatwave, events[0].Kind);
        Assert.Equal(3, events[0].StreakDays);
        Assert.Equal(WeatherExtremeSeverity.Warning, events[0].Severity);
        Assert.False(events[0].IsStronger);
    }

    [Fact]
    public void DetectHeatwaves_MarksCriticalWhenAnyDayHits40()
    {
        var days = new[]
        {
            Day(2026, 7, 10, max: 37),
            Day(2026, 7, 11, max: 40),
            Day(2026, 7, 12, max: 38),
        };

        var events = WeatherExtremeEventScanner.DetectHeatwaves("f1", days, Opts, Now).ToList();
        Assert.Single(events);
        Assert.True(events[0].IsStronger);
        Assert.Equal(WeatherExtremeSeverity.Critical, events[0].Severity);
    }

    [Fact]
    public void DetectFrost_SplitsFrostAndNearFrost()
    {
        var days = new[]
        {
            Day(2026, 1, 5, min: -1.3, max: 8),
            Day(2026, 1, 6, min: 1.2, max: 10),
            Day(2026, 1, 7, min: 3, max: 12),
        };

        var events = WeatherExtremeEventScanner.DetectFrostDays("f1", days, Opts, Now).ToList();
        Assert.Equal(2, events.Count);
        Assert.Contains(events, e => e.Kind == WeatherExtremeKinds.Frost && e.MinTemperatureC == -1.3);
        Assert.Contains(events, e => e.Kind == WeatherExtremeKinds.NearFrost && e.MinTemperatureC == 1.2);
    }

    [Fact]
    public void DetectHeavyRain_Uses30And50Thresholds()
    {
        var days = new[]
        {
            Day(2026, 3, 1, rain: 29.9),
            Day(2026, 3, 2, rain: 46),
            Day(2026, 3, 3, rain: 55),
        };

        var events = WeatherExtremeEventScanner.DetectHeavyRainDays("f1", days, Opts, Now).ToList();
        Assert.Equal(2, events.Count);
        Assert.Contains(events, e => e.RainTotalMm == 46 && !e.IsStronger);
        Assert.Contains(events, e => e.RainTotalMm == 55 && e.IsStronger);
    }

    [Fact]
    public void DetectDrought_Requires20DaysUnder5MmTotal()
    {
        var days = Enumerable.Range(1, 20)
            .Select(d => Day(2026, 6, d, rain: 0.2))
            .ToList();

        var events = WeatherExtremeEventScanner.DetectDroughts("f1", days, Opts, Now).ToList();
        Assert.Single(events);
        Assert.Equal(20, events[0].StreakDays);
        Assert.True(events[0].RainTotalMm < 5);
    }

    [Fact]
    public void DetectDrought_IgnoresWhenRainBreaksCap()
    {
        var days = Enumerable.Range(1, 19)
            .Select(d => Day(2026, 6, d, rain: 0))
            .Append(Day(2026, 6, 20, rain: 6))
            .ToList();

        var events = WeatherExtremeEventScanner.DetectDroughts("f1", days, Opts, Now).ToList();
        Assert.Empty(events);
    }

    [Fact]
    public void DetectColdSpell_UsesSeasonalThresholds()
    {
        var summerCold = new[]
        {
            Day(2026, 4, 1, max: 7),
            Day(2026, 4, 2, max: 6),
            Day(2026, 4, 3, max: 8),
        };
        Assert.Single(WeatherExtremeEventScanner.DetectColdSpells("f1", summerCold, Opts, Now));

        var mildWinter = new[]
        {
            Day(2026, 1, 10, max: 5),
            Day(2026, 1, 11, max: 4),
            Day(2026, 1, 12, max: 3),
        };
        Assert.Empty(WeatherExtremeEventScanner.DetectColdSpells("f1", mildWinter, Opts, Now));

        var harshWinter = new[]
        {
            Day(2026, 1, 10, max: 1),
            Day(2026, 1, 11, max: 0),
            Day(2026, 1, 12, max: 2),
        };
        Assert.Single(WeatherExtremeEventScanner.DetectColdSpells("f1", harshWinter, Opts, Now));
    }

    [Fact]
    public void DetectEvents_CombinesKindsWithoutDuplicatesByDedupKey()
    {
        var days = new List<FieldDailyWeatherSnapshot>
        {
            Day(2026, 7, 1, max: 38, min: 22),
            Day(2026, 7, 2, max: 39, min: 23),
            Day(2026, 7, 3, max: 40, min: 24),
            Day(2026, 7, 4, rain: 46, max: 28, min: 18),
        };

        var events = WeatherExtremeEventScanner.DetectEvents("f1", days, Opts, Now);
        Assert.Contains(events, e => e.Kind == WeatherExtremeKinds.Heatwave);
        Assert.Contains(events, e => e.Kind == WeatherExtremeKinds.HeavyRain);
        Assert.Equal(events.Select(e => e.DedupKey).Distinct().Count(), events.Count);
    }
}
