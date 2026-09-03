using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Providers;

/// <summary>
/// Reads modelled soil properties from ISRIC SoilGrids at the field centroid.
/// SoilGrids is a 250 m global model, so every value is flagged as a regional
/// estimate and never presented as a substitute for a soil test.
/// </summary>
public class SoilGridsProvider : ISoilProvider
{
    private const string BaseUrl = "https://rest.isric.org/soilgrids/v2.0/properties/query";
    private const string TopSoilDepth = "0-5cm";

    private readonly HttpClient _httpClient;
    private readonly ILogger<SoilGridsProvider> _logger;

    public string ProviderName => "SoilGrids (ISRIC)";

    public SoilGridsProvider(HttpClient httpClient, ILogger<SoilGridsProvider> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<SoilSummary> AnalyzeSoilAsync(GeoJsonPolygon boundary, double centroidLat, double centroidLng, CancellationToken cancellationToken = default)
    {
        try
        {
            var url = $"{BaseUrl}?lon={centroidLng.ToString("F6", CultureInfo.InvariantCulture)}" +
                      $"&lat={centroidLat.ToString("F6", CultureInfo.InvariantCulture)}" +
                      "&property=phh2o&property=clay&property=sand&property=silt" +
                      "&property=soc&property=nitrogen&property=bdod&property=cec" +
                      $"&depth={TopSoilDepth}&value=mean";

            var json = await _httpClient.GetFromJsonAsync<JsonElement>(url, cancellationToken);

            // SoilGrids stores integers scaled by a per-property factor documented in the API.
            return new SoilSummary
            {
                Ph = Scale(ReadMean(json, "phh2o"), 0.1),
                ClayPercent = Scale(ReadMean(json, "clay"), 0.1),
                SandPercent = Scale(ReadMean(json, "sand"), 0.1),
                SiltPercent = Scale(ReadMean(json, "silt"), 0.1),
                OrganicCarbonPercent = Scale(ReadMean(json, "soc"), 0.01),
                TotalNitrogenPercent = Scale(ReadMean(json, "nitrogen"), 0.01),
                BulkDensity = Scale(ReadMean(json, "bdod"), 0.01),
                CationExchangeCapacity = Scale(ReadMean(json, "cec"), 0.1),
                IsRegionalEstimate = true,
                Metadata = BuildMetadata()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SoilGrids lookup failed for {Lat},{Lng}", centroidLat, centroidLng);
            return new SoilSummary { IsRegionalEstimate = true, Metadata = BuildMetadata() };
        }
    }

    /// <summary>Returns null for absent properties so unknown values are never shown as zero.</summary>
    private static double? ReadMean(JsonElement json, string propertyName)
    {
        if (!json.TryGetProperty("properties", out var properties) ||
            !properties.TryGetProperty("layers", out var layers) ||
            layers.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var layer in layers.EnumerateArray())
        {
            if (!layer.TryGetProperty("name", out var name) || name.GetString() != propertyName) continue;
            if (!layer.TryGetProperty("depths", out var depths) || depths.GetArrayLength() == 0) continue;

            foreach (var depth in depths.EnumerateArray())
            {
                if (!depth.TryGetProperty("values", out var values)) continue;
                if (values.TryGetProperty("mean", out var mean) && mean.ValueKind == JsonValueKind.Number)
                {
                    return mean.GetDouble();
                }
            }
        }
        return null;
    }

    private static double? Scale(double? raw, double factor) => raw.HasValue ? Math.Round(raw.Value * factor, 2) : null;

    private DataSourceMetadata BuildMetadata() => new()
    {
        Source = ProviderName,
        SourceUrl = "https://soilgrids.org/",
        Attribution = "SoilGrids © ISRIC — World Soil Information",
        Licence = "CC BY 4.0",
        SpatialResolution = "250 m",
        TemporalResolution = "static",
        ValueType = "modelled",
        ConfidenceNote = "Regional soil estimate. Resolution: 250 m. Not a replacement for laboratory soil analysis.",
        LastUpdatedAt = DateTime.UtcNow
    };
}
