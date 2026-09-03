using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Core.ValueObjects.Geospatial;
using OliveLifecycle.Core.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Providers;

/// <summary>
/// Determines whether a field intersects or sits near a Natura 2000 protected area,
/// using the locally imported site boundaries.
/// </summary>
public class Natura2000Provider : IProtectedAreaProvider
{
    /// <summary>Sites further than this from the field bbox cannot be the nearest, so they are skipped.</summary>
    private const double CandidateSearchDegrees = 0.75;

    private readonly INaturaSiteRepository _naturaSiteRepository;
    private readonly ILogger<Natura2000Provider> _logger;

    public string ProviderName => "Natura 2000";

    public Natura2000Provider(INaturaSiteRepository naturaSiteRepository, ILogger<Natura2000Provider> logger)
    {
        _naturaSiteRepository = naturaSiteRepository;
        _logger = logger;
    }

    public async Task<EnvironmentalSummary> AnalyzeProtectedAreasAsync(
        GeoJsonPolygon boundary,
        double centroidLat,
        double centroidLng,
        CancellationToken cancellationToken = default)
    {
        var sites = await _naturaSiteRepository.GetAllAsync(cancellationToken);
        if (sites.Count == 0)
        {
            _logger.LogDebug("No Natura 2000 sites imported; protected area status unknown");
            return new EnvironmentalSummary { Metadata = BuildMetadata(null, "No Natura 2000 sites have been imported yet.") };
        }

        var fieldRing = boundary.Coordinates.Count > 0 ? boundary.Coordinates[0] : [];
        NaturaSite? nearest = null;
        var nearestDistanceKm = double.MaxValue;
        var intersects = false;

        foreach (var site in sites)
        {
            if (!IsCandidate(site, centroidLat, centroidLng)) continue;

            if (site.HasGeometry && ContainsAnyFieldVertex(site, fieldRing, centroidLat, centroidLng))
            {
                nearest = site;
                nearestDistanceKm = 0;
                intersects = true;
                break;
            }

            var distanceKm = DistanceToSiteKm(site, centroidLat, centroidLng);
            if (distanceKm < nearestDistanceKm)
            {
                nearestDistanceKm = distanceKm;
                nearest = site;
            }
        }

        if (nearest == null)
        {
            return new EnvironmentalSummary
            {
                Metadata = BuildMetadata(sites.Max(s => s.SourceDate), "No Natura 2000 site within the search radius.")
            };
        }

        return new EnvironmentalSummary
        {
            IntersectsNatura = intersects,
            DistanceToNearestNaturaKm = Math.Round(nearestDistanceKm, 2),
            NearestNaturaSite = nearest.Name,
            NearestNaturaSiteCode = nearest.SiteCode,
            NearestNaturaSiteType = nearest.SiteType,
            Metadata = BuildMetadata(nearest.SourceDate, nearest.HasGeometry
                ? null
                : "Distance measured to the site centroid because no boundary geometry was imported for it.")
        };
    }

    private static bool IsCandidate(NaturaSite site, double lat, double lng)
    {
        if (site.Bbox.Length == 4)
        {
            return lng >= site.Bbox[0] - CandidateSearchDegrees &&
                   lng <= site.Bbox[2] + CandidateSearchDegrees &&
                   lat >= site.Bbox[1] - CandidateSearchDegrees &&
                   lat <= site.Bbox[3] + CandidateSearchDegrees;
        }

        return Math.Abs(site.CentroidLat - lat) <= CandidateSearchDegrees &&
               Math.Abs(site.CentroidLng - lng) <= CandidateSearchDegrees;
    }

    /// <summary>
    /// A field counts as intersecting when its centroid or any boundary vertex falls
    /// inside a site ring. Full polygon clipping is unnecessary at field scale.
    /// </summary>
    private static bool ContainsAnyFieldVertex(NaturaSite site, List<List<double>> fieldRing, double centroidLat, double centroidLng)
    {
        foreach (var ring in site.Rings)
        {
            if (GeoMath.IsPointInRing(centroidLat, centroidLng, ring)) return true;
            foreach (var vertex in fieldRing)
            {
                if (vertex.Count >= 2 && GeoMath.IsPointInRing(vertex[1], vertex[0], ring)) return true;
            }
        }
        return false;
    }

    /// <summary>
    /// Shortest distance from the field centroid to the site boundary. Measured against
    /// ring segments, not just vertices, so sites with long straight edges are not
    /// reported as further away than they are.
    /// </summary>
    private static double DistanceToSiteKm(NaturaSite site, double lat, double lng)
    {
        if (!site.HasGeometry)
        {
            return GeoMath.DistanceKm(lat, lng, site.CentroidLat, site.CentroidLng);
        }

        var shortest = double.MaxValue;
        foreach (var ring in site.Rings)
        {
            var distance = GeoMath.DistanceToRingKm(lat, lng, ring);
            if (distance < shortest) shortest = distance;
        }

        return shortest == double.MaxValue
            ? GeoMath.DistanceKm(lat, lng, site.CentroidLat, site.CentroidLng)
            : shortest;
    }

    private DataSourceMetadata BuildMetadata(DateTime? sourceDate, string? note) => new()
    {
        Source = ProviderName,
        SourceUrl = "https://natura2000.eea.europa.eu/",
        Attribution = "Natura 2000 © European Environment Agency",
        Licence = "EEA standard re-use policy",
        SpatialResolution = "vector boundaries",
        TemporalResolution = "annual",
        ValueType = "measured",
        SourceDate = sourceDate,
        ConfidenceNote = note,
        LastUpdatedAt = DateTime.UtcNow
    };
}

