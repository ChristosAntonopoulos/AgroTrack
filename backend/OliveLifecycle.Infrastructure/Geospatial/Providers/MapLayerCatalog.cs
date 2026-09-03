using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Configuration.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Providers;

public class MapLayerCatalog : IMapLayerCatalog
{
    private readonly MapOptions _mapOptions;

    public MapLayerCatalog(IOptions<GeospatialOptions> options)
    {
        _mapOptions = options.Value.Map;
    }

    public IReadOnlyList<MapLayerDefinition> GetBaseLayers() => new List<MapLayerDefinition>
    {
        new() { Id = "standard", Name = "Standard", Category = "BASE", LayerType = "vector", TileUrlTemplate = _mapOptions.StyleUrl, Provider = _mapOptions.BaseMapProvider, Attribution = "© OpenFreeMap © OpenStreetMap", Licence = "ODbL", DefaultVisible = true },
        new() { Id = "satellite", Name = "Satellite", Category = "BASE", LayerType = "raster", TileUrlTemplate = _mapOptions.SatelliteTileUrl, Provider = "Esri", Attribution = "© Esri", DefaultVisible = false },
        new() { Id = "terrain", Name = "Terrain", Category = "BASE", LayerType = "raster", TileUrlTemplate = _mapOptions.StreetTileUrl, Provider = "OpenStreetMap", Attribution = "© OpenStreetMap", Licence = "ODbL", DefaultVisible = false }
    };

    public IReadOnlyList<MapLayerDefinition> GetOverlayLayers()
    {
        const string CopernicusAttribution = "Contains modified Copernicus Sentinel data";
        const string CopernicusUrl = "https://dataspace.copernicus.eu/";
        const string DemAttribution = "Copernicus DEM © ESA";

        var layers = new List<MapLayerDefinition>
        {
            new() { Id = "field-boundary", Name = "Field boundary", Category = "FIELD", LayerType = "vector", Provider = "AgroTrack", Attribution = "AgroTrack", DefaultVisible = true },
            new() { Id = "tasks", Name = "Tasks", Category = "FIELD", LayerType = "vector", Provider = "AgroTrack", Attribution = "AgroTrack", DefaultVisible = true },

            new() { Id = "truecolor", Name = "True colour", Category = "SATELLITE", LayerType = "raster", Provider = "Sentinel-2", Attribution = CopernicusAttribution, Licence = "Copernicus Open Access", SourceUrl = CopernicusUrl, SpatialResolution = "10 m" },
            new() { Id = "ndvi", Name = "Vegetation — NDVI", Category = "SATELLITE", LayerType = "raster", Provider = "Sentinel-2", Attribution = CopernicusAttribution, Licence = "Copernicus Open Access", SourceUrl = CopernicusUrl, SpatialResolution = "10 m" },
            new() { Id = "ndvi-change", Name = "Vegetation change", Category = "SATELLITE", LayerType = "raster", Provider = "Sentinel-2", Attribution = CopernicusAttribution, Licence = "Copernicus Open Access", SourceUrl = CopernicusUrl, SpatialResolution = "10 m" },
            new() { Id = "ndmi", Name = "Moisture — NDMI", Category = "SATELLITE", LayerType = "raster", Provider = "Sentinel-2", Attribution = CopernicusAttribution, Licence = "Copernicus Open Access", SourceUrl = CopernicusUrl, SpatialResolution = "20 m" },
            new() { Id = "ndre", Name = "Red edge — NDRE", Category = "SATELLITE", LayerType = "raster", Provider = "Sentinel-2", Attribution = CopernicusAttribution, Licence = "Copernicus Open Access", SourceUrl = CopernicusUrl, SpatialResolution = "20 m", Advanced = true },
            new() { Id = "ndwi", Name = "Water — NDWI", Category = "SATELLITE", LayerType = "raster", Provider = "Sentinel-2", Attribution = CopernicusAttribution, Licence = "Copernicus Open Access", SourceUrl = CopernicusUrl, SpatialResolution = "10 m", Advanced = true },
            new() { Id = "savi", Name = "Soil adjusted — SAVI", Category = "SATELLITE", LayerType = "raster", Provider = "Sentinel-2", Attribution = CopernicusAttribution, Licence = "Copernicus Open Access", SourceUrl = CopernicusUrl, SpatialResolution = "10 m", Advanced = true },

            new() { Id = "elevation", Name = "Elevation", Category = "TERRAIN", LayerType = "summary", Provider = "Copernicus DEM", Attribution = DemAttribution, Licence = "Copernicus Open Access", SourceUrl = "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM", SpatialResolution = "30 m" },
            new() { Id = "slope", Name = "Slope", Category = "TERRAIN", LayerType = "summary", Provider = "Copernicus DEM", Attribution = DemAttribution, Licence = "Copernicus Open Access", SpatialResolution = "30 m" },
            new() { Id = "aspect", Name = "Aspect", Category = "TERRAIN", LayerType = "summary", Provider = "Copernicus DEM", Attribution = DemAttribution, Licence = "Copernicus Open Access", SpatialResolution = "30 m" },

            new() { Id = "land-cover", Name = "Land cover", Category = "ENVIRONMENT", LayerType = "raster", TileUrlTemplate = _mapOptions.LandCoverTileUrl, Provider = "ESA WorldCover", Attribution = "© ESA WorldCover project / Contains modified Copernicus Sentinel data", Licence = "CC BY 4.0", SourceUrl = "https://esa-worldcover.org/", SpatialResolution = "10 m" },
            new() { Id = "soil", Name = "Soil", Category = "ENVIRONMENT", LayerType = "summary", Provider = "SoilGrids", Attribution = "© ISRIC — World Soil Information", Licence = "CC BY 4.0", SourceUrl = "https://soilgrids.org/", SpatialResolution = "250 m" },
            new() { Id = "natura", Name = "Natura 2000", Category = "ENVIRONMENT", LayerType = "vector", Provider = "European Environment Agency", Attribution = "© European Environment Agency", Licence = "EEA standard re-use policy", SourceUrl = "https://www.eea.europa.eu/en/datahub/datahubitem-view/6fc8ad2d-195d-40f4-bdec-576e7d1268e4" },
            new() { Id = "fires", Name = "Active fires", Category = "ENVIRONMENT", LayerType = "vector", Provider = "NASA FIRMS", Attribution = "NASA FIRMS", Licence = "Public domain", SourceUrl = "https://firms.modaps.eosdis.nasa.gov/", SpatialResolution = "375 m" }
        };

        // Offered only when an operator has supplied a tile endpoint, so the layer is
        // never advertised as an option that cannot draw anything.
        if (_mapOptions.CadastreLayerEnabled && !string.IsNullOrWhiteSpace(_mapOptions.CadastreTileUrl))
        {
            layers.Add(new MapLayerDefinition
            {
                Id = "cadastre",
                Name = "Hellenic Cadastre",
                Category = "ENVIRONMENT",
                LayerType = "raster",
                TileUrlTemplate = _mapOptions.CadastreTileUrl,
                Provider = "Hellenic Cadastre",
                Attribution = "© Hellenic Cadastre",
                SourceUrl = "https://www.ktimatologio.gr/",
                Advanced = true
            });
        }

        return layers;
    }
}
