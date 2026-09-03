namespace OliveLifecycle.Application.DTOs.Geospatial;

public class FieldEnvironmentalAlertDto
{
    public string Id { get; set; } = string.Empty;
    public string AlertType { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public string Confidence { get; set; } = "Medium";
    public string? RelatedTaskId { get; set; }
}

public class FieldSatelliteObservationDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public DateTime ObservationDate { get; set; }
    public double CloudCoverPercent { get; set; }

    /// <summary>Cloud cover measured over this field, which is what actually limits the reading.</summary>
    public double? FieldCloudCoverPercent { get; set; }

    public double? UsablePixelPercent { get; set; }
    public bool IsUsable { get; set; }
    public string Source { get; set; } = string.Empty;
    public string Resolution { get; set; } = string.Empty;
    public VegetationIndexStatsDto? Ndvi { get; set; }
    public VegetationIndexStatsDto? Ndmi { get; set; }
    public VegetationIndexStatsDto? Ndre { get; set; }
    public VegetationIndexStatsDto? Ndwi { get; set; }
    public VegetationIndexStatsDto? Savi { get; set; }
    public double? NdviChangePercent { get; set; }
    public DateTime? ComparedToObservationDate { get; set; }
    public double? AreaDeclinePercent { get; set; }
    public double? AreaIncreasePercent { get; set; }
    public double? AreaBelowBaselinePercent { get; set; }
    public string? TrueColorUrl { get; set; }
    public string? NdviUrl { get; set; }
    public string? NdmiUrl { get; set; }
    public string? NdreUrl { get; set; }
    public string? NdwiUrl { get; set; }
    public string? SaviUrl { get; set; }
    public string? NdviChangeUrl { get; set; }

    /// <summary>[minLng, minLat, maxLng, maxLat] the overlay images should be drawn within.</summary>
    public double[]? OverlayBounds { get; set; }

    public DataSourceMetadataDto Metadata { get; set; } = new();
}

/// <summary>Lightweight entry for the satellite date selector.</summary>
public class SatelliteDateDto
{
    public string ObservationId { get; set; } = string.Empty;
    public DateTime ObservationDate { get; set; }
    public double CloudCoverPercent { get; set; }
    public double? FieldCloudCoverPercent { get; set; }
    public double? UsablePixelPercent { get; set; }
    public bool IsUsable { get; set; }
    public double? NdviMean { get; set; }
    public bool HasTrueColor { get; set; }
    public bool HasNdvi { get; set; }
}

public class VegetationIndexStatsDto
{
    public double Mean { get; set; }
    public double Median { get; set; }
    public double Minimum { get; set; }
    public double Maximum { get; set; }
    public double StandardDeviation { get; set; }
    public double P10 { get; set; }
    public double P90 { get; set; }
    public int ValidPixelCount { get; set; }
    public string? TrendLabel { get; set; }
}

public class FieldMapDataDto
{
    public string FieldId { get; set; } = string.Empty;

    /// <summary>Observation the raster layers were taken from, when any were requested.</summary>
    public string? ObservationId { get; set; }
    public DateTime? ObservationDate { get; set; }
    public IReadOnlyList<MapLayerDataDto> Layers { get; set; } = Array.Empty<MapLayerDataDto>();
}

public class MapLayerDataDto
{
    public string LayerId { get; set; } = string.Empty;
    public string Type { get; set; } = "raster";
    public string? TileUrlTemplate { get; set; }

    /// <summary>[minLng, minLat, maxLng, maxLat] for image overlays.</summary>
    public double[]? Bounds { get; set; }
    public string? ImageUrl { get; set; }
    public double DefaultOpacity { get; set; } = 0.7;

    /// <summary>False when the layer has no data yet, so the UI can disable it rather than show an empty map.</summary>
    public bool Available { get; set; }

    public string? Attribution { get; set; }
    public string? SpatialResolution { get; set; }
    public LayerLegendDto? Legend { get; set; }
    public string? UnavailableReason { get; set; }
}

public class LayerLegendDto
{
    public double Minimum { get; set; }
    public double Maximum { get; set; }
    public IReadOnlyList<LegendStopDto> Stops { get; set; } = Array.Empty<LegendStopDto>();
}

public class LegendStopDto
{
    /// <summary>Position along the ramp from 0 to 1.</summary>
    public double Position { get; set; }
    public double Value { get; set; }
    public string Colour { get; set; } = string.Empty;
}

public class MapLayerCatalogDto
{
    public IReadOnlyList<MapLayerDefinitionDto> BaseLayers { get; set; } = Array.Empty<MapLayerDefinitionDto>();
    public IReadOnlyList<MapLayerDefinitionDto> OverlayLayers { get; set; } = Array.Empty<MapLayerDefinitionDto>();
}

public class MapLayerDefinitionDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string LayerType { get; set; } = string.Empty;
    public string? TileUrlTemplate { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string Attribution { get; set; } = string.Empty;
    public string Licence { get; set; } = string.Empty;
    public string? SourceUrl { get; set; }
    public string? SpatialResolution { get; set; }
    public bool DefaultVisible { get; set; }
    public bool Advanced { get; set; }
}

public class DataSourceHealthDto
{
    public string SourceId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? LastSuccessfulUpdate { get; set; }
    public string? LastError { get; set; }
    public string? Details { get; set; }
}

public class NaturaSiteStatusDto
{
    public long SiteCount { get; set; }
}

/// <summary>State of the background geospatial queues, for the admin data-sources view.</summary>
public class GeospatialJobStatusDto
{
    public long Pending { get; set; }
    public long Processing { get; set; }
    public long Completed { get; set; }
    public long Partial { get; set; }
    public long Failed { get; set; }
    public IReadOnlyList<GeospatialJobFailureDto> RecentFailures { get; set; } = Array.Empty<GeospatialJobFailureDto>();
}

public class GeospatialJobFailureDto
{
    public string JobType { get; set; } = string.Empty;
    public string? FieldId { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }
    public DateTime FailedAt { get; set; }
}

public class NaturaImportResultDto
{
    public int SitesImported { get; set; }
    public int SitesSkipped { get; set; }
    public IReadOnlyList<string> Warnings { get; set; } = Array.Empty<string>();
}

public class FieldIntelligenceSummaryDto
{
    public FieldWeatherDto? Weather { get; set; }
    public TerrainSummaryDto? Terrain { get; set; }
    public LandCoverSummaryDto? LandCover { get; set; }
    public SoilSummaryDto? Soil { get; set; }
    public SatelliteSummaryDto? Vegetation { get; set; }
    public EnvironmentalSummaryDto? Environment { get; set; }
    public string ProcessingStatus { get; set; } = "pending";
    public IReadOnlyList<FieldEnvironmentalAlertDto> Alerts { get; set; } = Array.Empty<FieldEnvironmentalAlertDto>();
}
