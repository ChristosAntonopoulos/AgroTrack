namespace OliveLifecycle.Core.ValueObjects;

public class GeoJsonPolygon
{
    public string Type { get; set; } = "Polygon";

    /// <summary>GeoJSON format: [ [ [lon, lat], ... ] ]</summary>
    public List<List<List<double>>> Coordinates { get; set; } = new();
}
