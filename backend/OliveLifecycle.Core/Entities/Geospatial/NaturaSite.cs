using OliveLifecycle.Core.ValueObjects;

namespace OliveLifecycle.Core.Entities.Geospatial;

/// <summary>
/// A Natura 2000 protected area. Boundaries are stored so proximity can be measured
/// against the actual site edge; a centroid alone would misreport large sites badly.
/// </summary>
public class NaturaSite : BaseEntity
{
    public string SiteCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>SCI, SPA or SCI/SPA as published by the EEA.</summary>
    public string? SiteType { get; set; }

    public double CentroidLat { get; set; }
    public double CentroidLng { get; set; }

    /// <summary>[minLng, minLat, maxLng, maxLat], used as a cheap pre-filter before polygon tests.</summary>
    public double[] Bbox { get; set; } = [];

    /// <summary>Outer rings of the site, each as [lng, lat] pairs. Empty when only a centroid is known.</summary>
    public List<List<List<double>>> Rings { get; set; } = [];

    public double? AreaHectares { get; set; }
    public string Source { get; set; } = string.Empty;
    public DateTime? SourceDate { get; set; }

    public bool HasGeometry => Rings.Count > 0;
}
