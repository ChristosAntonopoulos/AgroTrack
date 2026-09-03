using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Core.ValueObjects.Geospatial;
using OliveLifecycle.Core.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Providers;

/// <summary>
/// Reads ESA WorldCover 2021 (10 m) through the open Terrascope WMS. The field is
/// sampled on a regular grid and each hit is resolved to a WorldCover class, so the
/// percentages reported are real observations rather than regional assumptions.
/// </summary>
public class EsaWorldCoverProvider : ILandCoverProvider
{
    /// <summary>Official WorldCover class codes (see the ESA WorldCover product user manual).</summary>
    private static readonly Dictionary<int, string> ClassNames = new()
    {
        [10] = "Tree cover",
        [20] = "Shrubland",
        [30] = "Grassland",
        [40] = "Cropland",
        [50] = "Built-up",
        [60] = "Bare / sparse vegetation",
        [70] = "Snow and ice",
        [80] = "Permanent water bodies",
        [90] = "Herbaceous wetland",
        [95] = "Mangroves",
        [100] = "Moss and lichen"
    };

    private readonly HttpClient _httpClient;
    private readonly LandCoverOptions _options;
    private readonly ILogger<EsaWorldCoverProvider> _logger;

    public string ProviderName => "ESA WorldCover 2021";

    public EsaWorldCoverProvider(
        HttpClient httpClient,
        IOptions<GeospatialOptions> options,
        ILogger<EsaWorldCoverProvider> logger)
    {
        _httpClient = httpClient;
        _options = options.Value.LandCover;
        _logger = logger;
    }

    public async Task<LandCoverSummary> AnalyzeLandCoverAsync(GeoJsonPolygon boundary, string fieldId, CancellationToken cancellationToken = default)
    {
        var samples = BuildSamplePoints(boundary, _options.GridSize);
        if (samples.Count == 0)
        {
            _logger.LogWarning("Field {FieldId} produced no land cover sample points", fieldId);
            return new LandCoverSummary { Metadata = BuildMetadata() };
        }

        var counts = new Dictionary<string, int>();
        var failures = 0;

        foreach (var (lat, lng) in samples)
        {
            var className = await GetClassAtAsync(lat, lng, cancellationToken);
            if (className == null)
            {
                failures++;
                continue;
            }
            counts[className] = counts.GetValueOrDefault(className) + 1;
        }

        if (counts.Count == 0)
        {
            _logger.LogWarning("Land cover lookup failed for all {Count} samples on field {FieldId}", samples.Count, fieldId);
            return new LandCoverSummary { Metadata = BuildMetadata() };
        }

        var resolved = counts.Values.Sum();
        var summary = new LandCoverSummary
        {
            DominantClass = counts.OrderByDescending(c => c.Value).First().Key,
            PercentByClass = counts.ToDictionary(c => c.Key, c => Math.Round(c.Value * 100.0 / resolved, 1)),
            Metadata = BuildMetadata()
        };

        if (failures > 0)
        {
            summary.Metadata.ConfidenceNote =
                $"{resolved} of {samples.Count} sample points resolved; percentages cover the resolved points only.";
        }

        return summary;
    }

    /// <summary>
    /// WMS GetFeatureInfo returns the class value of the pixel under a 1x1 request
    /// window centred on the sample point.
    /// </summary>
    private async Task<string?> GetClassAtAsync(double lat, double lng, CancellationToken ct)
    {
        // A tiny bbox around the point keeps the returned pixel unambiguous.
        const double halfSpan = 0.00005;
        var bbox = string.Join(',', new[]
        {
            (lng - halfSpan).ToString("F7", CultureInfo.InvariantCulture),
            (lat - halfSpan).ToString("F7", CultureInfo.InvariantCulture),
            (lng + halfSpan).ToString("F7", CultureInfo.InvariantCulture),
            (lat + halfSpan).ToString("F7", CultureInfo.InvariantCulture)
        });

        var url = $"{_options.WmsUrl}?service=WMS&version=1.3.0&request=GetFeatureInfo" +
                  $"&layers={Uri.EscapeDataString(_options.LayerName)}" +
                  $"&query_layers={Uri.EscapeDataString(_options.LayerName)}" +
                  "&crs=EPSG:4326&width=1&height=1&i=0&j=0&info_format=application/json" +
                  $"&bbox={bbox}";

        try
        {
            var response = await _httpClient.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode) return null;

            var payload = await response.Content.ReadAsStringAsync(ct);
            return ParseClassName(payload);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "WorldCover lookup failed at {Lat},{Lng}", lat, lng);
            return null;
        }
    }

    private static string? ParseClassName(string geoJsonPayload)
    {
        try
        {
            using var document = JsonDocument.Parse(geoJsonPayload);
            if (!document.RootElement.TryGetProperty("features", out var features)) return null;

            foreach (var feature in features.EnumerateArray())
            {
                if (!feature.TryGetProperty("properties", out var properties)) continue;
                foreach (var property in properties.EnumerateObject())
                {
                    if (!TryReadInt(property.Value, out var code)) continue;
                    if (ClassNames.TryGetValue(code, out var name)) return name;
                }
            }
        }
        catch (JsonException)
        {
            // Non-JSON error documents are treated as an unresolved sample.
        }
        return null;
    }

    private static bool TryReadInt(JsonElement element, out int value)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Number when element.TryGetInt32(out value):
                return true;
            case JsonValueKind.String when int.TryParse(element.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out value):
                return true;
            default:
                value = 0;
                return false;
        }
    }

    /// <summary>Regular grid clipped to the boundary, so percentages reflect the field only.</summary>
    private static List<(double Lat, double Lng)> BuildSamplePoints(GeoJsonPolygon boundary, int gridSize)
    {
        if (boundary.Coordinates.Count == 0) return [];
        var ring = boundary.Coordinates[0];
        if (ring.Count < 4) return [];

        var bbox = GeoMath.BoundingBox(boundary);
        double minLng = bbox[0], minLat = bbox[1], maxLng = bbox[2], maxLat = bbox[3];
        var size = Math.Max(gridSize, 3);
        var points = new List<(double, double)>();

        for (var row = 0; row < size; row++)
        {
            for (var column = 0; column < size; column++)
            {
                // Cell centres avoid landing exactly on the boundary edges.
                var lat = minLat + (maxLat - minLat) * (row + 0.5) / size;
                var lng = minLng + (maxLng - minLng) * (column + 0.5) / size;
                if (GeoMath.IsPointInRing(lat, lng, ring)) points.Add((lat, lng));
            }
        }

        if (points.Count == 0)
        {
            // Slivers thinner than the grid spacing still get one representative sample.
            points.Add(((minLat + maxLat) / 2, (minLng + maxLng) / 2));
        }
        return points;
    }

    private DataSourceMetadata BuildMetadata() => new()
    {
        Source = ProviderName,
        SourceUrl = "https://esa-worldcover.org/",
        Attribution = "ESA WorldCover 2021 © ESA / VITO",
        Licence = "CC BY 4.0",
        SpatialResolution = "10 m",
        TemporalResolution = "annual (2021)",
        ValueType = "satellite derived",
        SourceDate = new DateTime(2021, 12, 31, 0, 0, 0, DateTimeKind.Utc),
        LastUpdatedAt = DateTime.UtcNow
    };
}
