using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Infrastructure.Geospatial.Processing;
using Xunit;

namespace OliveLifecycle.Infrastructure.Tests.Geospatial;

public class NaturaSiteImportServiceTests
{
    private readonly Mock<INaturaSiteRepository> _repository = new();
    private readonly List<NaturaSite> _upserted = [];

    public NaturaSiteImportServiceTests()
    {
        _repository.Setup(r => r.UpsertAsync(It.IsAny<NaturaSite>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((NaturaSite s, CancellationToken _) => s)
            .Callback((NaturaSite s, CancellationToken _) => _upserted.Add(s));
    }

    private NaturaSiteImportService CreateService() =>
        new(_repository.Object, NullLogger<NaturaSiteImportService>.Instance);

    private static Stream ToStream(string json) => new MemoryStream(Encoding.UTF8.GetBytes(json));

    private const string PolygonFeature = """
    {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": { "SITECODE": "GR3000006", "SITENAME": "Ymittos", "SITETYPE": "SCI", "AREAHA": 7716.0 },
          "geometry": {
            "type": "Polygon",
            "coordinates": [[[23.78, 37.92], [23.85, 37.92], [23.85, 37.99], [23.78, 37.99], [23.78, 37.92]]]
          }
        }
      ]
    }
    """;

    [Fact]
    public async Task ImportsAPolygonSiteWithItsAttributes()
    {
        var result = await CreateService().ImportFromGeoJsonAsync(ToStream(PolygonFeature));

        Assert.Equal(1, result.SitesImported);
        var site = Assert.Single(_upserted);
        Assert.Equal("GR3000006", site.SiteCode);
        Assert.Equal("Ymittos", site.Name);
        Assert.Equal("SCI", site.SiteType);
        Assert.Equal(7716.0, site.AreaHectares);
        Assert.Equal("EEA Natura 2000", site.Source);
    }

    [Fact]
    public async Task StoresRingsAndDerivedBoundingBox()
    {
        await CreateService().ImportFromGeoJsonAsync(ToStream(PolygonFeature));

        var site = _upserted[0];
        Assert.Single(site.Rings);
        Assert.Equal(5, site.Rings[0].Count);
        Assert.Equal([23.78, 37.92, 23.85, 37.99], site.Bbox);
        Assert.Equal(37.955, site.CentroidLat, 3);
        Assert.Equal(23.815, site.CentroidLng, 3);
    }

    [Fact]
    public async Task UsesTheSiteCodeAsTheIdSoReimportsRefreshRatherThanDuplicate()
    {
        await CreateService().ImportFromGeoJsonAsync(ToStream(PolygonFeature));

        Assert.Equal("GR3000006", _upserted[0].Id);
    }

    [Fact]
    public async Task ImportsEveryRingOfAMultiPolygon()
    {
        const string json = """
        {
          "type": "FeatureCollection",
          "features": [
            {
              "type": "Feature",
              "properties": { "SITECODE": "GR4110001", "SITENAME": "Islands" },
              "geometry": {
                "type": "MultiPolygon",
                "coordinates": [
                  [[[25.0, 39.0], [25.1, 39.0], [25.1, 39.1], [25.0, 39.1], [25.0, 39.0]]],
                  [[[26.0, 39.5], [26.1, 39.5], [26.1, 39.6], [26.0, 39.6], [26.0, 39.5]]]
                ]
              }
            }
          ]
        }
        """;

        await CreateService().ImportFromGeoJsonAsync(ToStream(json));

        var site = _upserted[0];
        Assert.Equal(2, site.Rings.Count);
        Assert.Equal([25.0, 39.0, 26.1, 39.6], site.Bbox);
    }

    [Fact]
    public async Task AcceptsLowercasePropertyNames()
    {
        const string json = """
        {
          "type": "FeatureCollection",
          "features": [
            {
              "type": "Feature",
              "properties": { "sitecode": "GR2000001", "sitename": "Lowercase site" },
              "geometry": {
                "type": "Polygon",
                "coordinates": [[[21.0, 38.0], [21.1, 38.0], [21.1, 38.1], [21.0, 38.1], [21.0, 38.0]]]
              }
            }
          ]
        }
        """;

        await CreateService().ImportFromGeoJsonAsync(ToStream(json));

        Assert.Equal("GR2000001", _upserted[0].SiteCode);
        Assert.Equal("Lowercase site", _upserted[0].Name);
    }

    [Fact]
    public async Task FallsBackToTheSiteCodeWhenNoNameIsPresent()
    {
        const string json = """
        {
          "type": "FeatureCollection",
          "features": [
            {
              "type": "Feature",
              "properties": { "SITECODE": "GR9999999" },
              "geometry": {
                "type": "Polygon",
                "coordinates": [[[21.0, 38.0], [21.1, 38.0], [21.1, 38.1], [21.0, 38.1], [21.0, 38.0]]]
              }
            }
          ]
        }
        """;

        await CreateService().ImportFromGeoJsonAsync(ToStream(json));

        Assert.Equal("GR9999999", _upserted[0].Name);
    }

    [Fact]
    public async Task SkipsFeaturesWithoutASiteCode()
    {
        const string json = """
        {
          "type": "FeatureCollection",
          "features": [
            {
              "type": "Feature",
              "properties": { "SITENAME": "Nameless" },
              "geometry": {
                "type": "Polygon",
                "coordinates": [[[21.0, 38.0], [21.1, 38.0], [21.1, 38.1], [21.0, 38.1], [21.0, 38.0]]]
              }
            }
          ]
        }
        """;

        var result = await CreateService().ImportFromGeoJsonAsync(ToStream(json));

        Assert.Equal(0, result.SitesImported);
        Assert.Equal(1, result.SitesSkipped);
        Assert.Empty(_upserted);
    }

    [Fact]
    public async Task SkipsFeaturesWithoutUsableGeometryAndWarns()
    {
        const string json = """
        {
          "type": "FeatureCollection",
          "features": [
            {
              "type": "Feature",
              "properties": { "SITECODE": "GR1111111" },
              "geometry": { "type": "Point", "coordinates": [21.0, 38.0] }
            }
          ]
        }
        """;

        var result = await CreateService().ImportFromGeoJsonAsync(ToStream(json));

        Assert.Equal(0, result.SitesImported);
        Assert.Equal(1, result.SitesSkipped);
        Assert.Contains(result.Warnings, w => w.Contains("GR1111111"));
    }

    [Fact]
    public async Task KeepsOneRecordPerSiteCodeWhenTheExportRepeatsIt()
    {
        const string json = """
        {
          "type": "FeatureCollection",
          "features": [
            {
              "type": "Feature",
              "properties": { "SITECODE": "GR5000001", "SITENAME": "First" },
              "geometry": { "type": "Polygon", "coordinates": [[[21.0, 38.0], [21.1, 38.0], [21.1, 38.1], [21.0, 38.1], [21.0, 38.0]]] }
            },
            {
              "type": "Feature",
              "properties": { "SITECODE": "GR5000001", "SITENAME": "Second" },
              "geometry": { "type": "Polygon", "coordinates": [[[22.0, 38.0], [22.1, 38.0], [22.1, 38.1], [22.0, 38.1], [22.0, 38.0]]] }
            }
          ]
        }
        """;

        var result = await CreateService().ImportFromGeoJsonAsync(ToStream(json));

        Assert.Equal(1, result.SitesImported);
        Assert.Equal("Second", Assert.Single(_upserted).Name);
    }

    [Fact]
    public async Task RejectsInputThatIsNotAFeatureCollection()
    {
        var result = await CreateService().ImportFromGeoJsonAsync(ToStream("""{"type":"Polygon"}"""));

        Assert.Equal(0, result.SitesImported);
        Assert.Contains(result.Warnings, w => w.Contains("FeatureCollection"));
    }
}
