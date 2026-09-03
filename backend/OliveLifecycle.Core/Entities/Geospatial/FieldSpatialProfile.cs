using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Core.Entities.Geospatial;

public class FieldSpatialProfile : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public int Version { get; set; } = 1;
    public GeospatialProcessingStatus ProcessingStatus { get; set; } = GeospatialProcessingStatus.Pending;
    public string? ProcessingError { get; set; }
    public DateTime? CalculatedAt { get; set; }
    public GeometrySummary? GeometrySummary { get; set; }
    public TerrainSummary? TerrainSummary { get; set; }
    public LandCoverSummary? LandCoverSummary { get; set; }
    public SoilSummary? SoilSummary { get; set; }
    public EnvironmentalSummary? EnvironmentalSummary { get; set; }
    public SatelliteSummary? LatestSatelliteSummary { get; set; }
    public WeatherSummary? LatestWeatherSummary { get; set; }
}
