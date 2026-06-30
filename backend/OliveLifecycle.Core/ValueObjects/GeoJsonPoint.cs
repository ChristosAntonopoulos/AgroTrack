namespace OliveLifecycle.Core.ValueObjects;

public class GeoJsonPoint
{
    public string Type { get; set; } = "Point";

    /// <summary>[lon, lat]</summary>
    public List<double> Coordinates { get; set; } = new();
}
