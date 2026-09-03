namespace OliveLifecycle.Core.ValueObjects.Geospatial;

public class GeometrySummary
{
    public double AreaSqm { get; set; }
    public double CentroidLat { get; set; }
    public double CentroidLng { get; set; }
    public double BboxMinLat { get; set; }
    public double BboxMinLng { get; set; }
    public double BboxMaxLat { get; set; }
    public double BboxMaxLng { get; set; }
}
