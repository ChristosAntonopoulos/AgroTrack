using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Services.Geospatial;
using Xunit;

namespace OliveLifecycle.Application.Tests.Geospatial;

public class SatelliteHistorySelectorTests
{
    [Fact]
    public void SelectBestPerMonth_PicksLowestCloudCoverInEachMonth()
    {
        var items = new[]
        {
            Scene("2025-01-04", 18),
            Scene("2025-01-19", 6),
            Scene("2025-02-03", 12),
            Scene("2025-02-20", 40),
            Scene("2024-12-11", 9)
        };

        var selected = SatelliteHistorySelector.SelectBestPerMonth(items);

        Assert.Equal(3, selected.Count);
        Assert.Equal("2024-12-11", selected[0].ItemId);
        Assert.Equal("2025-01-19", selected[1].ItemId);
        Assert.Equal("2025-02-03", selected[2].ItemId);
    }

    [Fact]
    public void SelectBestPerMonth_IgnoresItemsWithoutADate()
    {
        var selected = SatelliteHistorySelector.SelectBestPerMonth(
        [
            new SatelliteCatalogItem { ItemId = "undated", CloudCoverPercent = 1 },
            Scene("2025-06-01", 10)
        ]);

        Assert.Single(selected);
        Assert.Equal("2025-06-01", selected[0].ItemId);
    }

    private static SatelliteCatalogItem Scene(string date, double cloud) => new()
    {
        ItemId = date,
        ObservationDate = DateTime.Parse(date, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal),
        CloudCoverPercent = cloud
    };
}
