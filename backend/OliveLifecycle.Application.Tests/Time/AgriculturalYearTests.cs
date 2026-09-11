using OliveLifecycle.Core.Time;
using Xunit;

namespace OliveLifecycle.Application.Tests.Time;

public class AgriculturalYearTests
{
    [Theory]
    [InlineData("2026-02-01T00:00:00+02:00", 2026)]
    [InlineData("2026-09-10T12:00:00Z", 2026)]
    [InlineData("2027-01-15T10:00:00Z", 2026)]
    [InlineData("2027-01-31T20:00:00+02:00", 2026)]
    [InlineData("2027-02-01T00:00:00+02:00", 2027)]
    [InlineData("2026-01-20T12:00:00Z", 2025)]
    public void For_UsesFebruaryToJanuaryWindow(string iso, int expected)
    {
        var value = DateTimeOffset.Parse(iso).UtcDateTime;
        Assert.Equal(expected, AgriculturalYear.For(value));
    }

    [Fact]
    public void Bounds_KeepJanuaryInsidePreviousResultYear()
    {
        var (from, toExclusive) = AgriculturalYear.BoundsUtc(2026);
        var january = new DateTime(2027, 1, 15, 12, 0, 0, DateTimeKind.Utc);
        var february = new DateTime(2027, 2, 1, 12, 0, 0, DateTimeKind.Utc);

        Assert.True(january >= from && january < toExclusive);
        Assert.False(february < toExclusive && AgriculturalYear.Contains(february, 2026));
        Assert.True(AgriculturalYear.Contains(january, 2026));
    }

    [Fact]
    public void Months_RunFebruaryThroughJanuary()
    {
        var months = AgriculturalYear.Months(2026);
        Assert.Equal(12, months.Count);
        Assert.Equal((2026, 2), months[0]);
        Assert.Equal((2027, 1), months[^1]);
    }

    [Fact]
    public void Labels_AreGreekByDefault()
    {
        Assert.Equal("Καλλιεργητική χρονιά 2026", AgriculturalYear.Title(2026));
        Assert.Contains("Φεβ", AgriculturalYear.RangeLabel(2026));
        Assert.Contains("Ιαν", AgriculturalYear.RangeLabel(2026));
    }
}
