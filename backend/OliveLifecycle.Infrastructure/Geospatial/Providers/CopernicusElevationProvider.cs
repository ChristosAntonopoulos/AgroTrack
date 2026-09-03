using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Core.ValueObjects.Geospatial;
using OliveLifecycle.Infrastructure.Geospatial.Spatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Providers;

/// <summary>
/// Derives terrain statistics from the Copernicus GLO-30 DEM, sampled through
/// Open-Meteo's free elevation endpoint (no API key, batched requests).
/// Slope and aspect use a Horn 3x3 kernel over a regular grid, which is the same
/// method GDAL uses, so results are comparable to a raster-based pipeline.
/// </summary>
public class CopernicusElevationProvider : IElevationProvider
{
    private const int MaxCoordinatesPerRequest = 100;
    private const int DefaultGridSize = 11;

    private readonly HttpClient _httpClient;
    private readonly TerrainOptions _terrainOptions;
    private readonly SlopeClassificationOptions _slopeOptions;
    private readonly ILogger<CopernicusElevationProvider> _logger;

    public string ProviderName => "Copernicus DEM GLO-30";

    public CopernicusElevationProvider(
        HttpClient httpClient,
        IOptions<GeospatialOptions> options,
        ILogger<CopernicusElevationProvider> logger)
    {
        _httpClient = httpClient;
        _terrainOptions = options.Value.Terrain;
        _slopeOptions = options.Value.SlopeClassification;
        _logger = logger;
    }

    public async Task<TerrainAnalysisResult> AnalyzeTerrainAsync(GeoJsonPolygon boundary, string fieldId, CancellationToken cancellationToken = default)
    {
        var grid = ElevationGrid.Build(boundary, DefaultGridSize);
        if (grid == null)
        {
            _logger.LogWarning("Field {FieldId} boundary produced no elevation grid", fieldId);
            return new TerrainAnalysisResult { Summary = new TerrainSummary { Metadata = BuildMetadata() } };
        }

        var elevations = await FetchElevationsAsync(grid.AllPoints, cancellationToken);
        if (elevations == null)
        {
            _logger.LogWarning("Elevation lookup failed for field {FieldId}; terrain left unknown", fieldId);
            return new TerrainAnalysisResult { Summary = new TerrainSummary { Metadata = BuildMetadata() } };
        }

        grid.SetElevations(elevations);
        var summary = grid.Summarize(_slopeOptions);
        summary.Metadata = BuildMetadata();

        _logger.LogInformation(
            "Terrain for field {FieldId}: {Samples} samples, mean slope {Slope}%, aspect {Aspect}",
            fieldId, summary.SampleCount, summary.AverageSlopePercent, summary.DominantAspect);

        return new TerrainAnalysisResult { Summary = summary };
    }

    /// <summary>
    /// Fetches elevations for every grid node in batches. Returns null when the
    /// provider is unreachable so callers can leave terrain unknown rather than
    /// publishing a partial surface.
    /// </summary>
    private async Task<List<double?>?> FetchElevationsAsync(IReadOnlyList<(double Lat, double Lng)> points, CancellationToken ct)
    {
        var results = new List<double?>(points.Count);

        for (var offset = 0; offset < points.Count; offset += MaxCoordinatesPerRequest)
        {
            var batch = points.Skip(offset).Take(MaxCoordinatesPerRequest).ToList();
            var latitudes = string.Join(',', batch.Select(p => p.Lat.ToString("F5", CultureInfo.InvariantCulture)));
            var longitudes = string.Join(',', batch.Select(p => p.Lng.ToString("F5", CultureInfo.InvariantCulture)));
            var url = $"{_terrainOptions.ElevationApiUrl}?latitude={latitudes}&longitude={longitudes}";

            try
            {
                var json = await _httpClient.GetFromJsonAsync<JsonElement>(url, ct);
                if (!json.TryGetProperty("elevation", out var array) || array.ValueKind != JsonValueKind.Array)
                {
                    _logger.LogWarning("Elevation response had no elevation array");
                    return null;
                }

                for (var i = 0; i < batch.Count; i++)
                {
                    results.Add(i < array.GetArrayLength() && array[i].ValueKind != JsonValueKind.Null
                        ? array[i].GetDouble()
                        : null);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Elevation batch request failed");
                return null;
            }
        }

        return results;
    }

    private DataSourceMetadata BuildMetadata() => new()
    {
        Source = ProviderName,
        SourceUrl = "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM",
        Attribution = "Copernicus DEM © ESA, produced using Copernicus WorldDEM-30",
        Licence = "Free and open (Copernicus)",
        SpatialResolution = "30 m",
        TemporalResolution = "static",
        ValueType = "derived",
        LastUpdatedAt = DateTime.UtcNow
    };
}
