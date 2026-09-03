using OliveLifecycle.Application.Abstractions.Geospatial;

namespace OliveLifecycle.Application.Services.Geospatial;

/// <summary>
/// Picks one Sentinel-2 scene per month so a new field can get years of NDVI
/// history without processing every five-day pass.
/// </summary>
public static class SatelliteHistorySelector
{
    public static IReadOnlyList<SatelliteCatalogItem> SelectBestPerMonth(IEnumerable<SatelliteCatalogItem> items)
    {
        return items
            .Where(item => item.ObservationDate != default)
            .GroupBy(item => new DateTime(item.ObservationDate.Year, item.ObservationDate.Month, 1))
            .Select(month => month
                .OrderBy(item => item.CloudCoverPercent)
                .ThenByDescending(item => item.ObservationDate)
                .First())
            .OrderBy(item => item.ObservationDate)
            .ToList();
    }
}
