using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Application.DTOs.Geospatial;

public class FieldSpatialProfileDto
{
    public string FieldId { get; set; } = string.Empty;
    public string ProcessingStatus { get; set; } = "pending";
    public string? ProcessingError { get; set; }
    public DateTime? CalculatedAt { get; set; }
    public int Version { get; set; }
    public GeometrySummaryDto? Geometry { get; set; }
    public TerrainSummaryDto? Terrain { get; set; }
    public LandCoverSummaryDto? LandCover { get; set; }
    public SoilSummaryDto? Soil { get; set; }
    public EnvironmentalSummaryDto? Environment { get; set; }
    public SatelliteSummaryDto? Satellite { get; set; }
    public WeatherSummaryDto? Weather { get; set; }
}

public class GeometrySummaryDto
{
    public double AreaSqm { get; set; }
    public double CentroidLat { get; set; }
    public double CentroidLng { get; set; }
    public double[] Bbox { get; set; } = Array.Empty<double>();
}

public class DataSourceMetadataDto
{
    public string Source { get; set; } = string.Empty;
    public string? SourceUrl { get; set; }
    public string? Attribution { get; set; }
    public string? Licence { get; set; }
    public string? SpatialResolution { get; set; }
    public string? TemporalResolution { get; set; }
    public string ValueType { get; set; } = "derived";
    public DateTime? SourceDate { get; set; }
    public DateTime? LastUpdatedAt { get; set; }
    public bool? IsRegionalEstimate { get; set; }
    public string? ConfidenceNote { get; set; }
}

public class TerrainSummaryDto
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
    public string? DominantSlopeClass { get; set; }
    public Dictionary<string, double> SlopeZonePercent { get; set; } = new();
    public int SampleCount { get; set; }
    public DataSourceMetadataDto Metadata { get; set; } = new();
}

public class LandCoverSummaryDto
{
    public string? DominantClass { get; set; }
    public Dictionary<string, double> PercentByClass { get; set; } = new();
    public DataSourceMetadataDto Metadata { get; set; } = new();
}

public class SoilSummaryDto
{
    public double? Ph { get; set; }
    public double? ClayPercent { get; set; }
    public double? SandPercent { get; set; }
    public double? SiltPercent { get; set; }
    public double? OrganicCarbonPercent { get; set; }
    public bool IsRegionalEstimate { get; set; } = true;
    public DataSourceMetadataDto Metadata { get; set; } = new();
}

public class EnvironmentalSummaryDto
{
    public bool IntersectsNatura { get; set; }
    public double? DistanceToNearestNaturaKm { get; set; }
    public string? NearestNaturaSite { get; set; }
    public string? NearestNaturaSiteCode { get; set; }
    public string? NearestNaturaSiteType { get; set; }
    public ClosestFireDto? ClosestFire { get; set; }
    public DataSourceMetadataDto Metadata { get; set; } = new();
}

public class ClosestFireDto
{
    public double DistanceKm { get; set; }
    public string? Direction { get; set; }
    public DateTime DetectedAt { get; set; }
    public string? Confidence { get; set; }
}

public class SatelliteSummaryDto
{
    public string? LatestObservationId { get; set; }
    public DateTime? ObservationDate { get; set; }
    public double? CloudCoverPercent { get; set; }
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
    public DataSourceMetadataDto Metadata { get; set; } = new();
}

public class WeatherSummaryDto
{
    public double? CurrentTemperatureC { get; set; }
    public double? RainNext24hMm { get; set; }
    public double? WindSpeedKmh { get; set; }
    public string? FrostRiskLevel { get; set; }
    public string? FrostWindow { get; set; }
    public double? ForecastMinTempC { get; set; }
    public double? ForecastMaxTempC { get; set; }
    public DataSourceMetadataDto Metadata { get; set; } = new();
}
