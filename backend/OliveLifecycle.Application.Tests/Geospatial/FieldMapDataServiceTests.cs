using Moq;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.ValueObjects.Geospatial;
using Xunit;

namespace OliveLifecycle.Application.Tests.Geospatial;

public class FieldMapDataServiceTests
{
    private const string FieldId = "field-1";

    private readonly Mock<IFieldSatelliteObservationRepository> _observationRepository = new();
    private readonly Mock<IFieldSpatialProfileRepository> _profileRepository = new();
    private readonly Mock<IMapLayerCatalog> _layerCatalog = new();
    private readonly Mock<IGeospatialStorageService> _storage = new();
    private readonly FieldMapDataService _service;

    public FieldMapDataServiceTests()
    {
        _layerCatalog.Setup(c => c.GetOverlayLayers()).Returns(new List<MapLayerDefinition>
        {
            new() { Id = "ndvi", Name = "NDVI", Category = "SATELLITE", LayerType = "raster", Provider = "Sentinel-2", Attribution = "Copernicus", SpatialResolution = "10 m" },
            new() { Id = "ndmi", Name = "NDMI", Category = "SATELLITE", LayerType = "raster", Provider = "Sentinel-2", SpatialResolution = "20 m" },
            new() { Id = "truecolor", Name = "True colour", Category = "SATELLITE", LayerType = "raster", Provider = "Sentinel-2" },
            new() { Id = "ndvi-change", Name = "Change", Category = "SATELLITE", LayerType = "raster", Provider = "Sentinel-2" },
            new() { Id = "slope", Name = "Slope", Category = "TERRAIN", LayerType = "summary", Provider = "Copernicus DEM" },
            new() { Id = "fires", Name = "Fires", Category = "ENVIRONMENT", LayerType = "vector", Provider = "NASA FIRMS" },
            new() { Id = "land-cover", Name = "Land cover", Category = "ENVIRONMENT", LayerType = "raster", TileUrlTemplate = "https://tiles.example/{z}/{x}/{y}.png", Provider = "ESA WorldCover" },
            new() { Id = "cadastre", Name = "Cadastre", Category = "ENVIRONMENT", LayerType = "raster", Provider = "Hellenic Cadastre" }
        });

        _storage.Setup(s => s.GetPublicUrl(It.IsAny<string?>()))
            .Returns((string? path) => path == null ? null : $"/uploads/geospatial/{path}");

        _profileRepository.Setup(r => r.GetByFieldIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldSpatialProfile?)null);

        _service = new FieldMapDataService(
            _observationRepository.Object,
            _profileRepository.Object,
            _layerCatalog.Object,
            _storage.Object);
    }

    private static FieldSatelliteObservation Observation(string id = "obs-1", bool withChange = false) => new()
    {
        Id = id,
        FieldId = FieldId,
        ObservationDate = new DateTime(2026, 3, 10, 9, 30, 0, DateTimeKind.Utc),
        Resolution = "10 m",
        NdviStoragePath = $"fields/{FieldId}/satellite/{id}/ndvi.png",
        TrueColorStoragePath = $"fields/{FieldId}/satellite/{id}/truecolor.png",
        NdviChangeStoragePath = withChange ? $"fields/{FieldId}/satellite/{id}/ndvi-change.png" : null,
        OverlayBounds = [22.90, 37.90, 22.91, 37.91],
        Metadata = new DataSourceMetadata { Attribution = "Contains modified Copernicus Sentinel data" }
    };

    private void SetLatest(FieldSatelliteObservation? observation)
        => _observationRepository.Setup(r => r.GetLatestUsableAsync(FieldId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(observation);

    [Fact]
    public async Task GetMapDataAsync_ReturnsOverlayUrlAndBoundsForAnAvailableIndex()
    {
        SetLatest(Observation());

        var result = await _service.GetMapDataAsync(FieldId, ["ndvi"], null);

        var layer = Assert.Single(result.Layers);
        Assert.True(layer.Available);
        Assert.Equal("/uploads/geospatial/fields/field-1/satellite/obs-1/ndvi.png", layer.ImageUrl);
        Assert.Equal(new[] { 22.90, 37.90, 22.91, 37.91 }, layer.Bounds);
        Assert.Equal("obs-1", result.ObservationId);
        Assert.Equal(new DateTime(2026, 3, 10, 9, 30, 0, DateTimeKind.Utc), result.ObservationDate);
    }

    [Fact]
    public async Task GetMapDataAsync_ExplainsWhyALayerIsUnavailableInsteadOfReturningAnEmptyImage()
    {
        SetLatest(Observation());

        var result = await _service.GetMapDataAsync(FieldId, ["ndmi"], null);

        var layer = Assert.Single(result.Layers);
        Assert.False(layer.Available);
        Assert.Null(layer.ImageUrl);
        Assert.Equal("This index was not available in the source scene.", layer.UnavailableReason);
    }

    [Fact]
    public async Task GetMapDataAsync_ExplainsThatChangeNeedsASecondObservation()
    {
        SetLatest(Observation());

        var result = await _service.GetMapDataAsync(FieldId, ["ndvi-change"], null);

        var layer = Assert.Single(result.Layers);
        Assert.False(layer.Available);
        Assert.Equal("A second cloud-free observation is needed before change can be shown.", layer.UnavailableReason);
    }

    [Fact]
    public async Task GetMapDataAsync_ServesTheChangeOverlayOnceTwoDatesExist()
    {
        SetLatest(Observation(withChange: true));

        var result = await _service.GetMapDataAsync(FieldId, ["ndvi-change"], null);

        Assert.True(Assert.Single(result.Layers).Available);
    }

    [Fact]
    public async Task GetMapDataAsync_ReportsNoImageryWhenAFieldHasNotBeenProcessed()
    {
        SetLatest(null);

        var result = await _service.GetMapDataAsync(FieldId, ["ndvi"], null);

        var layer = Assert.Single(result.Layers);
        Assert.False(layer.Available);
        Assert.Equal("No usable satellite observation for this field yet.", layer.UnavailableReason);
        Assert.Null(result.ObservationId);
    }

    [Fact]
    public async Task GetMapDataAsync_HonoursAPinnedObservationForTheDateSelector()
    {
        SetLatest(Observation("newest"));
        _observationRepository.Setup(r => r.GetByIdAsync("older", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Observation("older"));

        var result = await _service.GetMapDataAsync(FieldId, ["ndvi"], "older");

        Assert.Equal("older", result.ObservationId);
        Assert.Contains("older", Assert.Single(result.Layers).ImageUrl);
    }

    [Fact]
    public async Task GetMapDataAsync_RefusesAnObservationBelongingToAnotherField()
    {
        SetLatest(Observation("newest"));
        _observationRepository.Setup(r => r.GetByIdAsync("foreign", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldSatelliteObservation { Id = "foreign", FieldId = "another-field" });

        var result = await _service.GetMapDataAsync(FieldId, ["ndvi"], "foreign");

        Assert.Null(result.ObservationId);
        Assert.False(Assert.Single(result.Layers).Available);
    }

    [Fact]
    public async Task GetMapDataAsync_IncludesALegendMatchingTheRenderedRamp()
    {
        SetLatest(Observation());

        var result = await _service.GetMapDataAsync(FieldId, ["ndvi"], null);

        var legend = Assert.Single(result.Layers).Legend;
        Assert.NotNull(legend);
        Assert.Equal(-0.1, legend.Minimum);
        Assert.Equal(0.9, legend.Maximum);
        Assert.Equal(5, legend.Stops.Count);
        Assert.Equal(0, legend.Stops[0].Position);
        Assert.Equal(1, legend.Stops[^1].Position);
        Assert.All(legend.Stops, stop => Assert.Matches("^#[0-9A-F]{6}$", stop.Colour));
    }

    [Fact]
    public async Task GetMapDataAsync_OmitsALegendForTrueColourImagery()
    {
        SetLatest(Observation());

        var result = await _service.GetMapDataAsync(FieldId, ["truecolor"], null);

        Assert.Null(Assert.Single(result.Layers).Legend);
    }

    [Fact]
    public async Task GetMapDataAsync_MarksTerrainAvailableOnlyOnceItHasBeenDerived()
    {
        var withoutTerrain = await _service.GetMapDataAsync(FieldId, ["slope"], null);
        Assert.False(Assert.Single(withoutTerrain.Layers).Available);

        _profileRepository.Setup(r => r.GetByFieldIdAsync(FieldId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldSpatialProfile { FieldId = FieldId, TerrainSummary = new TerrainSummary() });

        var withTerrain = await _service.GetMapDataAsync(FieldId, ["slope"], null);
        Assert.True(Assert.Single(withTerrain.Layers).Available);
    }

    [Fact]
    public async Task GetMapDataAsync_DoesNotLoadImageryForNonSatelliteLayers()
    {
        await _service.GetMapDataAsync(FieldId, ["fires"], null);

        _observationRepository.Verify(r => r.GetLatestUsableAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetMapDataAsync_FlagsUnknownLayerIdentifiers()
    {
        var result = await _service.GetMapDataAsync(FieldId, ["not-a-layer"], null);

        var layer = Assert.Single(result.Layers);
        Assert.False(layer.Available);
        Assert.Equal("Unknown layer.", layer.UnavailableReason);
    }

    [Fact]
    public async Task GetMapDataAsync_ServesAnExternallyTiledOverlayFromItsTemplate()
    {
        var result = await _service.GetMapDataAsync(FieldId, ["land-cover"], null);

        var layer = Assert.Single(result.Layers);
        Assert.True(layer.Available);
        Assert.Equal("https://tiles.example/{z}/{x}/{y}.png", layer.TileUrlTemplate);
        Assert.Null(layer.ImageUrl);
    }

    [Fact]
    public async Task GetMapDataAsync_DisablesATiledOverlayThatHasNoConfiguredEndpoint()
    {
        var result = await _service.GetMapDataAsync(FieldId, ["cadastre"], null);

        var layer = Assert.Single(result.Layers);
        Assert.False(layer.Available);
        Assert.Equal("No tile endpoint is configured for this layer.", layer.UnavailableReason);
    }

    [Fact]
    public async Task GetMapDataAsync_ReturnsLayersInTheRequestedOrder()
    {
        SetLatest(Observation());

        var result = await _service.GetMapDataAsync(FieldId, ["truecolor", "ndvi", "fires"], null);

        Assert.Equal(["truecolor", "ndvi", "fires"], result.Layers.Select(l => l.LayerId));
    }
}
