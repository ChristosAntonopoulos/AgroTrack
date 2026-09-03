namespace OliveLifecycle.Core.ValueObjects.Geospatial;

public class SatelliteSummary
{
    public string? LatestObservationId { get; set; }
    public DateTime? ObservationDate { get; set; }
    public double? CloudCoverPercent { get; set; }

    /// <summary>Cloud cover measured over the field, not the whole scene.</summary>
    public double? FieldCloudCoverPercent { get; set; }

    public double? UsablePixelPercent { get; set; }
    public double? NdviMean { get; set; }
    public double? NdviMedian { get; set; }
    public string? NdviTrendLabel { get; set; }
    public double? NdviChangePercent { get; set; }
    public DateTime? ComparedToObservationDate { get; set; }
    public double? AreaBelowBaselinePercent { get; set; }
    public double? NdmiMean { get; set; }
    public double? NdreMean { get; set; }
    public double? NdwiMean { get; set; }
    public double? SaviMean { get; set; }
    public DataSourceMetadata Metadata { get; set; } = new();
}
