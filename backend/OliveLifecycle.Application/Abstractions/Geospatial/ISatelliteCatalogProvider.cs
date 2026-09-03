namespace OliveLifecycle.Application.Abstractions.Geospatial;

/// <summary>Canonical band names used across the platform, independent of any provider's asset keys.</summary>
public static class SatelliteBands
{
    public const string Blue = "blue";
    public const string Green = "green";
    public const string Red = "red";
    public const string RedEdge = "rededge";
    public const string Nir = "nir";
    public const string Swir16 = "swir16";
    public const string SceneClassification = "scl";
    public const string TrueColour = "visual";
}

public class SatelliteCatalogItem
{
    public string ItemId { get; set; } = string.Empty;
    public DateTime ObservationDate { get; set; }
    public double CloudCoverPercent { get; set; }
    public string Platform { get; set; } = "Sentinel-2";

    /// <summary>Band assets keyed by <see cref="SatelliteBands"/> names. Values are HTTP-readable COG URLs.</summary>
    public Dictionary<string, string> Assets { get; set; } = [];

    public string? AssetUrl => Assets.TryGetValue(SatelliteBands.TrueColour, out var url) ? url : null;

    public bool HasBands(params string[] bands) => bands.All(b => Assets.ContainsKey(b));
}

public class SatelliteSearchRequest
{
    public double MinLat { get; set; }
    public double MinLng { get; set; }
    public double MaxLat { get; set; }
    public double MaxLng { get; set; }
    public int MaxCloudCover { get; set; } = 100;
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Limit { get; set; } = 10;
}

public interface ISatelliteCatalogProvider
{
    string ProviderName { get; }

    Task<IReadOnlyList<SatelliteCatalogItem>> SearchAsync(SatelliteSearchRequest request, CancellationToken cancellationToken = default);

    Task<SatelliteCatalogItem?> GetItemAsync(string itemId, CancellationToken cancellationToken = default);
}
