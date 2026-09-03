namespace OliveLifecycle.Infrastructure.Geospatial;

/// <summary>
/// Named HTTP clients for the geospatial providers. Raster reads need a much longer
/// timeout and no automatic decompression, so they cannot share the client used for
/// small JSON API calls.
/// </summary>
public static class GeospatialHttpClients
{
    public const string Raster = "geospatial-raster";
}
