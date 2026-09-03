using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Core.Entities.Geospatial;

public class FieldSatelliteObservation : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;

    /// <summary>Catalogue item the observation was derived from, used to avoid reprocessing.</summary>
    public string CatalogItemId { get; set; } = string.Empty;

    public DateTime ObservationDate { get; set; }

    /// <summary>Cloud cover of the whole scene as reported by the catalogue.</summary>
    public double CloudCoverPercent { get; set; }

    /// <summary>Cloud, shadow and snow cover measured over this field only.</summary>
    public double? FieldCloudCoverPercent { get; set; }

    /// <summary>Share of in-boundary pixels that survived masking.</summary>
    public double? UsablePixelPercent { get; set; }

    /// <summary>
    /// False when too little of the field was visible for the statistics to describe
    /// the field as a whole. Unusable observations are kept for the date selector but
    /// never drive alerts or comparisons.
    /// </summary>
    public bool IsUsable { get; set; } = true;

    public string Source { get; set; } = "Sentinel-2";
    public string Resolution { get; set; } = "10 m";

    public string? TrueColorStoragePath { get; set; }
    public string? NdviStoragePath { get; set; }
    public string? NdmiStoragePath { get; set; }
    public string? NdreStoragePath { get; set; }
    public string? NdwiStoragePath { get; set; }
    public string? SaviStoragePath { get; set; }
    public string? NdviChangeStoragePath { get; set; }

    /// <summary>Geographic extent of the generated overlays as [minLng, minLat, maxLng, maxLat].</summary>
    public double[]? OverlayBounds { get; set; }

    public VegetationIndexStats? NdviStats { get; set; }
    public VegetationIndexStats? NdmiStats { get; set; }
    public VegetationIndexStats? NdreStats { get; set; }
    public VegetationIndexStats? NdwiStats { get; set; }
    public VegetationIndexStats? SaviStats { get; set; }

    /// <summary>Change in mean NDVI against the previous usable observation.</summary>
    public double? NdviChangePercent { get; set; }

    /// <summary>Observation the change figures were computed against.</summary>
    public string? ComparedToObservationId { get; set; }
    public DateTime? ComparedToObservationDate { get; set; }

    public double? AreaDeclinePercent { get; set; }
    public double? AreaIncreasePercent { get; set; }

    /// <summary>Share of the field below the field's own historical NDVI baseline.</summary>
    public double? AreaBelowBaselinePercent { get; set; }

    public DataSourceMetadata Metadata { get; set; } = new();
}
