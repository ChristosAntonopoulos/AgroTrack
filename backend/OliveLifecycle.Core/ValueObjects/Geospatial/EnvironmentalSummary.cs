namespace OliveLifecycle.Core.ValueObjects.Geospatial;

public class EnvironmentalSummary
{
    public bool IntersectsNatura { get; set; }
    public double? DistanceToNearestNaturaKm { get; set; }
    public string? NearestNaturaSite { get; set; }
    public string? NearestNaturaSiteCode { get; set; }
    public string? NearestNaturaSiteType { get; set; }
    public ClosestFireSummary? ClosestFire { get; set; }
    public DataSourceMetadata Metadata { get; set; } = new();
}

public class ClosestFireSummary
{
    public double DistanceKm { get; set; }
    public string? Direction { get; set; }
    public DateTime DetectedAt { get; set; }
    public string? Confidence { get; set; }
}
