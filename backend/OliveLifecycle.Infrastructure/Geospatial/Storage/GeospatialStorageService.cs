using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Storage;

public class GeospatialStorageService : IGeospatialStorageService
{
    private readonly string _rootPath;
    private readonly string _publicBasePath;
    private readonly ILogger<GeospatialStorageService> _logger;

    public GeospatialStorageService(IConfiguration configuration, ILogger<GeospatialStorageService> logger)
    {
        var storageRoot = configuration["Storage:LocalPath"] ?? "uploads";
        var rasterRoot = configuration["Geospatial:Storage:RasterRoot"] ?? "geospatial";
        var basePath = Path.IsPathRooted(storageRoot) ? storageRoot : Path.Combine(Directory.GetCurrentDirectory(), storageRoot);
        _rootPath = Path.Combine(basePath, rasterRoot);
        _publicBasePath = $"{configuration["Storage:PublicBasePath"] ?? "/uploads"}/{rasterRoot}".Replace("//", "/");
        _logger = logger;
        Directory.CreateDirectory(_rootPath);
    }

    public async Task<string> SaveRasterAsync(string relativePath, Stream content, CancellationToken cancellationToken = default)
    {
        var fullPath = GetAbsolutePath(relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await using var fs = File.Create(fullPath);
        await content.CopyToAsync(fs, cancellationToken);
        _logger.LogDebug("Saved raster to {Path}", fullPath);
        return relativePath;
    }

    public async Task SaveRasterBytesAsync(string relativePath, byte[] content, CancellationToken cancellationToken = default)
    {
        var fullPath = GetAbsolutePath(relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await File.WriteAllBytesAsync(fullPath, content, cancellationToken);
    }

    public Task<Stream> OpenReadAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        var fullPath = GetAbsolutePath(relativePath);
        Stream stream = File.OpenRead(fullPath);
        return Task.FromResult(stream);
    }

    public Task<bool> ExistsAsync(string relativePath, CancellationToken cancellationToken = default)
        => Task.FromResult(File.Exists(GetAbsolutePath(relativePath)));

    public Task DeleteAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        var fullPath = GetAbsolutePath(relativePath);
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }

    /// <summary>
    /// Resolves a raster path inside the geospatial root. Paths are validated because
    /// callers include values derived from external catalogue identifiers.
    /// </summary>
    public string GetAbsolutePath(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
            throw new ArgumentException("Raster path is required.", nameof(relativePath));

        var combined = Path.GetFullPath(Path.Combine(_rootPath, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        var root = Path.GetFullPath(_rootPath);
        if (!combined.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(combined, root, StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Raster path resolves outside the geospatial storage root.");
        }

        return combined;
    }

    public string? GetPublicUrl(string? relativePath) => string.IsNullOrWhiteSpace(relativePath)
        ? null
        : $"{_publicBasePath.TrimEnd('/')}/{relativePath.Replace('\\', '/').TrimStart('/')}";
}
