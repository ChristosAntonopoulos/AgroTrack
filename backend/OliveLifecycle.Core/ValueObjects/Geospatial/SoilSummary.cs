namespace OliveLifecycle.Core.ValueObjects.Geospatial;

public class SoilSummary
{
    public double? Ph { get; set; }
    public double? ClayPercent { get; set; }
    public double? SandPercent { get; set; }
    public double? SiltPercent { get; set; }
    public double? OrganicCarbonPercent { get; set; }
    public double? TotalNitrogenPercent { get; set; }
    public double? BulkDensity { get; set; }
    public double? CationExchangeCapacity { get; set; }
    public bool IsRegionalEstimate { get; set; } = true;
    public DataSourceMetadata Metadata { get; set; } = new();
}
