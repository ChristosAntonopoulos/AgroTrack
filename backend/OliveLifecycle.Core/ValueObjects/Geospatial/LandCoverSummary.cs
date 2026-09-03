namespace OliveLifecycle.Core.ValueObjects.Geospatial;

public class LandCoverSummary
{
    public string? DominantClass { get; set; }
    public Dictionary<string, double> PercentByClass { get; set; } = new();
    public string? RasterStoragePath { get; set; }
    public DataSourceMetadata Metadata { get; set; } = new();
}
