namespace OliveLifecycle.Core.ValueObjects.Geospatial;

public class DataSourceMetadata
{
    public string Source { get; set; } = string.Empty;
    public string? SourceUrl { get; set; }
    public string? Attribution { get; set; }
    public string? Licence { get; set; }
    public string? SpatialResolution { get; set; }
    public string? TemporalResolution { get; set; }
    public string ValueType { get; set; } = "derived"; // measured | modelled | derived
    public DateTime? SourceDate { get; set; }
    public DateTime? LastUpdatedAt { get; set; }

    /// <summary>
    /// True when the source grid is too coarse for the field, so the value describes
    /// the surrounding area rather than the field itself.
    /// </summary>
    public bool IsRegionalEstimate { get; set; }

    /// <summary>Explains any limitation behind the value (partial coverage, coarse resolution, regional estimate).</summary>
    public string? ConfidenceNote { get; set; }
}
