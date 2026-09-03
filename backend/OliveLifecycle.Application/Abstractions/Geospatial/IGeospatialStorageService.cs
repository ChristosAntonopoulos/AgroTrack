namespace OliveLifecycle.Application.Abstractions.Geospatial;

public interface IGeospatialStorageService
{
    Task<string> SaveRasterAsync(string relativePath, Stream content, CancellationToken cancellationToken = default);
    Task SaveRasterBytesAsync(string relativePath, byte[] content, CancellationToken cancellationToken = default);
    Task<Stream> OpenReadAsync(string relativePath, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string relativePath, CancellationToken cancellationToken = default);
    Task DeleteAsync(string relativePath, CancellationToken cancellationToken = default);
    string GetAbsolutePath(string relativePath);

    /// <summary>Returns null when no raster has been stored for the given slot.</summary>
    string? GetPublicUrl(string? relativePath);
}
