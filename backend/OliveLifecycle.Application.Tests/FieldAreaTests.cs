using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Time;
using OliveLifecycle.Core.Units;
using OliveLifecycle.Core.ValueObjects;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FieldAreaTests
{
    [Fact]
    public void TenThousandSqm_IsTenStremmata_AndOneHectare()
    {
        Assert.Equal(1d, FieldArea.HectaresFromSqm(10_000));
        Assert.Equal(10d, FieldArea.StremmataFromSqm(10_000));
        Assert.Equal(10_000d, FieldArea.SqmFromHectares(1));
    }

    [Fact]
    public void PrefersMeasuredSqm_OverLegacyHectaresField()
    {
        var field = new Field
        {
            Area = 3041.7584604638014,
            AppMeasuredAreaSqm = 3041.7584604638014
        };
        field.NormalizeStoredArea();
        Assert.Equal(0.30417584604638014, field.Area, 6);
        Assert.Equal(3041.7584604638014, field.ResolveAreaSqm());
        Assert.Equal(0.30417584604638014, field.ResolveAreaHectares());
    }

    [Fact]
    public void DemoHectares_WithoutMeasuredSqm_StayHectares()
    {
        var field = new Field { Area = 12.5 };
        Assert.Equal(125_000d, field.ResolveAreaSqm());
        Assert.Equal(12.5, field.ResolveAreaHectares());
    }

    [Fact]
    public void CadastreOfficialSqm_UsedWhenMeasuredMissing()
    {
        var field = new Field
        {
            Area = 0,
            GreekCadastre = new GreekCadastreInfo { OfficialAreaSqm = 3041.76 }
        };
        Assert.Equal(3041.76, field.ResolveAreaSqm());
    }
}

public class CultivationSeasonTests
{
    [Fact]
    public void SeptemberStartsNewSeason_AugustBelongsToPrevious()
    {
        var september = new DateTime(2026, 9, 1, 12, 0, 0, DateTimeKind.Utc);
        var august = new DateTime(2026, 8, 15, 12, 0, 0, DateTimeKind.Utc);
        Assert.Equal(2026, CultivationSeason.StartYearFor(september));
        Assert.Equal(2025, CultivationSeason.StartYearFor(august));
        Assert.True(CultivationSeason.Contains(september, 2026));
        Assert.True(CultivationSeason.MatchesPeriod(september, 2026, "calendar"));
        Assert.True(CultivationSeason.MatchesPeriod(august, 2026, "calendar"));
        Assert.True(CultivationSeason.MatchesPeriod(august, 2025, "season"));
        Assert.False(CultivationSeason.MatchesPeriod(august, 2026, "season"));
    }

    [Fact]
    public void DateOnlyMidnight_DoesNotShiftCalendarDay()
    {
        var dateOnly = new DateTime(2024, 11, 2, 0, 0, 0, DateTimeKind.Unspecified);
        Assert.Equal(new DateOnly(2024, 11, 2), AthensTime.CalendarDate(dateOnly));
        Assert.Equal(2024, AthensTime.CalendarYear(dateOnly));
    }
}
