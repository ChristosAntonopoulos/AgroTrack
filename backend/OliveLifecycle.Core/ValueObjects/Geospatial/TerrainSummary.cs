namespace OliveLifecycle.Core.ValueObjects.Geospatial;

public class TerrainSummary
{
    public double? MinElevationM { get; set; }
    public double? MaxElevationM { get; set; }
    public double? AverageElevationM { get; set; }
    public double? MedianElevationM { get; set; }
    public double? ElevationRangeM { get; set; }
    public double? AverageSlopePercent { get; set; }
    public double? MaxSlopePercent { get; set; }
    public double? AverageSlopeDegrees { get; set; }
    public double? MaxSlopeDegrees { get; set; }
    public string? DominantAspect { get; set; }

    /// <summary>Slope class covering most of the field (Flat, Moderate, Steep, Very steep).</summary>
    public string? DominantSlopeClass { get; set; }

    /// <summary>Share of the field in each slope class, so terraced or mixed fields are visible.</summary>
    public Dictionary<string, double> SlopeZonePercent { get; set; } = new();

    /// <summary>Number of DEM points sampled inside the boundary; low counts mean low confidence.</summary>
    public int SampleCount { get; set; }

    public string? HillshadeStoragePath { get; set; }
    public DataSourceMetadata Metadata { get; set; } = new();
}
