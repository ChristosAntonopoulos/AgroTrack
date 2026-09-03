using System.Text.Json;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Processing;

/// <summary>
/// Imports Natura 2000 site boundaries from an EEA GeoJSON export. The import is
/// idempotent on site code, so re-running it refreshes rather than duplicates sites.
/// </summary>
public class NaturaSiteImportService : INaturaSiteImportService
{
    /// <summary>Property names used across EEA and national Natura 2000 exports.</summary>
    private static readonly string[] SiteCodeKeys = ["SITECODE", "sitecode", "site_code", "SITE_CODE", "CODE"];
    private static readonly string[] NameKeys = ["SITENAME", "sitename", "site_name", "NAME", "name"];
    private static readonly string[] TypeKeys = ["SITETYPE", "sitetype", "site_type", "TYPE", "type"];
    private static readonly string[] AreaKeys = ["AREAHA", "areaha", "area_ha", "SHAPE_Area"];

    private readonly INaturaSiteRepository _repository;
    private readonly ILogger<NaturaSiteImportService> _logger;

    public NaturaSiteImportService(INaturaSiteRepository repository, ILogger<NaturaSiteImportService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<NaturaImportResult> ImportFromGeoJsonAsync(Stream geoJsonStream, CancellationToken cancellationToken = default)
    {
        var result = new NaturaImportResult();
        using var document = await JsonDocument.ParseAsync(geoJsonStream, cancellationToken: cancellationToken);

        if (!document.RootElement.TryGetProperty("features", out var features) || features.ValueKind != JsonValueKind.Array)
        {
            result.Warnings.Add("Input is not a GeoJSON FeatureCollection.");
            return result;
        }

        var sites = new List<NaturaSite>();
        foreach (var feature in features.EnumerateArray())
        {
            var site = TryReadSite(feature, result);
            if (site != null) sites.Add(site);
        }

        // Later duplicates of the same code win, matching the EEA export ordering.
        foreach (var site in sites.GroupBy(s => s.SiteCode).Select(g => g.Last()))
        {
            await _repository.UpsertAsync(site, cancellationToken);
            result.SitesImported++;
        }

        _logger.LogInformation(
            "Natura 2000 import complete: {Imported} sites imported, {Skipped} skipped",
            result.SitesImported, result.SitesSkipped);

        return result;
    }

    private NaturaSite? TryReadSite(JsonElement feature, NaturaImportResult result)
    {
        if (!feature.TryGetProperty("properties", out var properties))
        {
            result.SitesSkipped++;
            return null;
        }

        var siteCode = ReadString(properties, SiteCodeKeys);
        if (string.IsNullOrWhiteSpace(siteCode))
        {
            result.SitesSkipped++;
            return null;
        }

        var rings = feature.TryGetProperty("geometry", out var geometry)
            ? ReadRings(geometry)
            : [];

        if (rings.Count == 0)
        {
            result.SitesSkipped++;
            result.Warnings.Add($"Site {siteCode} has no usable polygon geometry.");
            return null;
        }

        var allVertices = rings.SelectMany(r => r).Where(v => v.Count >= 2).ToList();
        var bbox = new[]
        {
            allVertices.Min(v => v[0]),
            allVertices.Min(v => v[1]),
            allVertices.Max(v => v[0]),
            allVertices.Max(v => v[1])
        };

        return new NaturaSite
        {
            Id = siteCode,
            SiteCode = siteCode,
            Name = ReadString(properties, NameKeys) ?? siteCode,
            SiteType = ReadString(properties, TypeKeys),
            AreaHectares = ReadDouble(properties, AreaKeys),
            Rings = rings,
            Bbox = bbox,
            CentroidLng = (bbox[0] + bbox[2]) / 2,
            CentroidLat = (bbox[1] + bbox[3]) / 2,
            Source = "EEA Natura 2000",
            SourceDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>Extracts outer rings from Polygon or MultiPolygon geometries.</summary>
    private static List<List<List<double>>> ReadRings(JsonElement geometry)
    {
        var rings = new List<List<List<double>>>();
        if (!geometry.TryGetProperty("type", out var typeElement) ||
            !geometry.TryGetProperty("coordinates", out var coordinates))
        {
            return rings;
        }

        switch (typeElement.GetString())
        {
            case "Polygon":
                AddOuterRing(coordinates, rings);
                break;
            case "MultiPolygon":
                foreach (var polygon in coordinates.EnumerateArray())
                {
                    AddOuterRing(polygon, rings);
                }
                break;
        }
        return rings;
    }

    private static void AddOuterRing(JsonElement polygon, List<List<List<double>>> rings)
    {
        if (polygon.ValueKind != JsonValueKind.Array || polygon.GetArrayLength() == 0) return;

        var ring = new List<List<double>>();
        foreach (var position in polygon[0].EnumerateArray())
        {
            if (position.ValueKind != JsonValueKind.Array || position.GetArrayLength() < 2) continue;
            ring.Add([position[0].GetDouble(), position[1].GetDouble()]);
        }

        if (ring.Count >= 4) rings.Add(ring);
    }

    private static string? ReadString(JsonElement properties, string[] keys)
    {
        foreach (var key in keys)
        {
            if (properties.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String)
            {
                var text = value.GetString();
                if (!string.IsNullOrWhiteSpace(text)) return text.Trim();
            }
        }
        return null;
    }

    private static double? ReadDouble(JsonElement properties, string[] keys)
    {
        foreach (var key in keys)
        {
            if (properties.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.Number)
            {
                return value.GetDouble();
            }
        }
        return null;
    }
}
