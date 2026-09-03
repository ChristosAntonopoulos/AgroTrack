using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Configuration.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Providers;

/// <summary>
/// Discovers Sentinel-2 L2A scenes through a STAC API and resolves the band assets
/// needed for index processing. STAC catalogues name their assets inconsistently,
/// so provider-specific keys are normalised onto <see cref="SatelliteBands"/>.
/// </summary>
public class CopernicusStacProvider : ISatelliteCatalogProvider
{
    /// <summary>Candidate asset keys per canonical band, in order of preference.</summary>
    private static readonly Dictionary<string, string[]> AssetAliases = new()
    {
        [SatelliteBands.Blue] = ["blue", "B02", "B02_10m"],
        [SatelliteBands.Green] = ["green", "B03", "B03_10m"],
        [SatelliteBands.Red] = ["red", "B04", "B04_10m"],
        [SatelliteBands.RedEdge] = ["rededge1", "rededge", "B05", "B05_20m"],
        [SatelliteBands.Nir] = ["nir", "nir08", "B08", "B08_10m"],
        [SatelliteBands.Swir16] = ["swir16", "B11", "B11_20m"],
        [SatelliteBands.SceneClassification] = ["scl", "SCL", "SCL_20m"],
        [SatelliteBands.TrueColour] = ["visual", "TCI", "visual_10m"]
    };

    private readonly HttpClient _httpClient;
    private readonly SatelliteOptions _options;
    private readonly ILogger<CopernicusStacProvider> _logger;

    public string ProviderName => "Sentinel-2 L2A (STAC)";

    public CopernicusStacProvider(HttpClient httpClient, IOptions<GeospatialOptions> options, ILogger<CopernicusStacProvider> logger)
    {
        _httpClient = httpClient;
        _options = options.Value.Satellite;
        _logger = logger;
    }

    public async Task<IReadOnlyList<SatelliteCatalogItem>> SearchAsync(SatelliteSearchRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var to = request.To ?? DateTime.UtcNow;
            var from = request.From ?? to.AddDays(-_options.SearchWindowDays);

            var body = new
            {
                collections = new[] { _options.Collection },
                bbox = new[] { request.MinLng, request.MinLat, request.MaxLng, request.MaxLat },
                datetime = $"{from.ToUniversalTime():yyyy-MM-ddTHH:mm:ssZ}/{to.ToUniversalTime():yyyy-MM-ddTHH:mm:ssZ}",
                limit = Math.Clamp(request.Limit, 1, 100),
                query = new Dictionary<string, object>
                {
                    ["eo:cloud_cover"] = new { lte = request.MaxCloudCover }
                }
            };

            var url = $"{_options.StacBaseUrl.TrimEnd('/')}/search";
            using var response = await _httpClient.PostAsJsonAsync(url, body, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("STAC search returned {StatusCode} from {Url}", response.StatusCode, url);
                return [];
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
            if (!json.TryGetProperty("features", out var features) || features.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            var items = new List<SatelliteCatalogItem>();
            foreach (var feature in features.EnumerateArray())
            {
                var item = ParseFeature(feature);
                if (item != null)
                {
                    items.Add(item);
                }
            }

            return items
                .OrderByDescending(i => i.ObservationDate)
                .ToList();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "STAC search failed");
            return [];
        }
    }

    public async Task<SatelliteCatalogItem?> GetItemAsync(string itemId, CancellationToken cancellationToken = default)
    {
        try
        {
            var url = $"{_options.StacBaseUrl.TrimEnd('/')}/collections/{_options.Collection}/items/{Uri.EscapeDataString(itemId)}";
            using var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var feature = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
            return ParseFeature(feature);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "STAC item lookup failed for {ItemId}", itemId);
            return null;
        }
    }

    private static SatelliteCatalogItem? ParseFeature(JsonElement feature)
    {
        if (!feature.TryGetProperty("id", out var idElement))
        {
            return null;
        }

        var id = idElement.GetString();
        if (string.IsNullOrWhiteSpace(id))
        {
            return null;
        }

        var item = new SatelliteCatalogItem { ItemId = id };

        if (feature.TryGetProperty("properties", out var properties))
        {
            if (properties.TryGetProperty("datetime", out var datetime) &&
                DateTime.TryParse(datetime.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var parsed))
            {
                item.ObservationDate = parsed;
            }

            if (properties.TryGetProperty("eo:cloud_cover", out var cloud) && cloud.ValueKind == JsonValueKind.Number)
            {
                item.CloudCoverPercent = cloud.GetDouble();
            }

            if (properties.TryGetProperty("platform", out var platform) && platform.GetString() is { Length: > 0 } platformName)
            {
                item.Platform = platformName;
            }
        }

        if (item.ObservationDate == default)
        {
            return null;
        }

        if (feature.TryGetProperty("assets", out var assets) && assets.ValueKind == JsonValueKind.Object)
        {
            foreach (var (band, aliases) in AssetAliases)
            {
                foreach (var alias in aliases)
                {
                    if (!assets.TryGetProperty(alias, out var asset))
                    {
                        continue;
                    }

                    if (asset.TryGetProperty("href", out var href) && href.GetString() is { Length: > 0 } url)
                    {
                        item.Assets[band] = url;
                        break;
                    }
                }
            }
        }

        return item;
    }
}
