using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Infrastructure.Geospatial.Providers;
using Xunit;

namespace OliveLifecycle.Infrastructure.Tests.Geospatial;

public class Natura2000ProviderTests
{
    private readonly Mock<INaturaSiteRepository> _repository = new();

    private Natura2000Provider CreateProvider() =>
        new(_repository.Object, NullLogger<Natura2000Provider>.Instance);

    private static GeoJsonPolygon FieldAt(double lat, double lng) => new()
    {
        Coordinates =
        [
            [
                [lng - 0.002, lat - 0.002],
                [lng + 0.002, lat - 0.002],
                [lng + 0.002, lat + 0.002],
                [lng - 0.002, lat + 0.002],
                [lng - 0.002, lat - 0.002]
            ]
        ]
    };

    /// <summary>A square protected area covering roughly 0.1 degrees around the given point.</summary>
    private static NaturaSite SiteAt(string code, string name, double lat, double lng, double halfSpan = 0.05) => new()
    {
        Id = code,
        SiteCode = code,
        Name = name,
        SiteType = "SCI",
        Rings =
        [
            [
                [lng - halfSpan, lat - halfSpan],
                [lng + halfSpan, lat - halfSpan],
                [lng + halfSpan, lat + halfSpan],
                [lng - halfSpan, lat + halfSpan],
                [lng - halfSpan, lat - halfSpan]
            ]
        ],
        Bbox = [lng - halfSpan, lat - halfSpan, lng + halfSpan, lat + halfSpan],
        CentroidLat = lat,
        CentroidLng = lng,
        SourceDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
    };

    private void HasSites(params NaturaSite[] sites) =>
        _repository.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(sites);

    [Fact]
    public async Task ReportsUnknownWhenNoSitesHaveBeenImported()
    {
        HasSites();

        var result = await CreateProvider().AnalyzeProtectedAreasAsync(FieldAt(37.9, 23.7), 37.9, 23.7);

        Assert.False(result.IntersectsNatura);
        Assert.Null(result.DistanceToNearestNaturaKm);
        Assert.Contains("have been imported", result.Metadata.ConfidenceNote);
    }

    [Fact]
    public async Task DetectsAFieldInsideAProtectedArea()
    {
        HasSites(SiteAt("GR1000001", "Ymittos", 37.9, 23.7));

        var result = await CreateProvider().AnalyzeProtectedAreasAsync(FieldAt(37.9, 23.7), 37.9, 23.7);

        Assert.True(result.IntersectsNatura);
        Assert.Equal(0, result.DistanceToNearestNaturaKm);
        Assert.Equal("Ymittos", result.NearestNaturaSite);
        Assert.Equal("GR1000001", result.NearestNaturaSiteCode);
        Assert.Equal("SCI", result.NearestNaturaSiteType);
    }

    [Fact]
    public async Task MeasuresDistanceToTheSiteEdgeNotItsCentre()
    {
        // A large site whose centroid is far away, but whose edge is close by.
        HasSites(SiteAt("GR1000002", "Large site", 37.5, 23.7, halfSpan: 0.3));

        var result = await CreateProvider().AnalyzeProtectedAreasAsync(FieldAt(37.9, 23.7), 37.9, 23.7);

        Assert.False(result.IntersectsNatura);
        // Edge sits at 37.8, ~11 km away; the centroid is ~44 km away.
        Assert.InRange(result.DistanceToNearestNaturaKm!.Value, 5, 20);
    }

    [Fact]
    public async Task PicksTheNearestOfSeveralSites()
    {
        HasSites(
            SiteAt("GR1000003", "Far", 37.5, 23.7, halfSpan: 0.01),
            SiteAt("GR1000004", "Near", 37.93, 23.7, halfSpan: 0.01));

        var result = await CreateProvider().AnalyzeProtectedAreasAsync(FieldAt(37.9, 23.7), 37.9, 23.7);

        Assert.Equal("Near", result.NearestNaturaSite);
    }

    [Fact]
    public async Task IgnoresSitesFarOutsideTheSearchWindow()
    {
        // Northern Greece, far from an Athens field.
        HasSites(SiteAt("GR1200001", "Olympus", 40.1, 22.3, halfSpan: 0.02));

        var result = await CreateProvider().AnalyzeProtectedAreasAsync(FieldAt(37.9, 23.7), 37.9, 23.7);

        Assert.Null(result.NearestNaturaSite);
        Assert.Contains("within the search radius", result.Metadata.ConfidenceNote);
    }

    [Fact]
    public async Task FlagsCentroidOnlySitesInTheConfidenceNote()
    {
        var site = SiteAt("GR1000005", "Centroid only", 37.93, 23.7);
        site.Rings = [];
        site.Bbox = [];
        HasSites(site);

        var result = await CreateProvider().AnalyzeProtectedAreasAsync(FieldAt(37.9, 23.7), 37.9, 23.7);

        Assert.Equal("Centroid only", result.NearestNaturaSite);
        Assert.Contains("centroid", result.Metadata.ConfidenceNote);
    }

    [Fact]
    public async Task DetectsIntersectionWhenOnlyAFieldCornerIsInside()
    {
        // Site edge runs through the middle of the field.
        HasSites(SiteAt("GR1000006", "Edge overlap", 37.9 + 0.05, 23.7, halfSpan: 0.05));

        var result = await CreateProvider().AnalyzeProtectedAreasAsync(FieldAt(37.9, 23.7), 37.9, 23.7);

        Assert.True(result.IntersectsNatura);
    }

    [Fact]
    public async Task AlwaysReportsProvenance()
    {
        HasSites(SiteAt("GR1000007", "Ymittos", 37.9, 23.7));

        var result = await CreateProvider().AnalyzeProtectedAreasAsync(FieldAt(37.9, 23.7), 37.9, 23.7);

        Assert.Equal("Natura 2000", result.Metadata.Source);
        Assert.Equal("measured", result.Metadata.ValueType);
        Assert.Contains("European Environment Agency", result.Metadata.Attribution);
        Assert.Equal(new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), result.Metadata.SourceDate);
    }
}
