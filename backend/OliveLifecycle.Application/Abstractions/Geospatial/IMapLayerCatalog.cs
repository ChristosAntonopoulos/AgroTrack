namespace OliveLifecycle.Application.Abstractions.Geospatial;

public class MapLayerDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string LayerType { get; set; } = "raster";
    public string? TileUrlTemplate { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string Attribution { get; set; } = string.Empty;
    public string Licence { get; set; } = string.Empty;
    public string? SourceUrl { get; set; }
    public string? SpatialResolution { get; set; }
    public bool DefaultVisible { get; set; }
    public bool Advanced { get; set; }
}

public interface IMapLayerCatalog
{
    IReadOnlyList<MapLayerDefinition> GetBaseLayers();
    IReadOnlyList<MapLayerDefinition> GetOverlayLayers();
}
