using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Storage;

namespace OliveLifecycle.Infrastructure.Storage;

public class LocalFileStorageService : IFileStorageService
{
    private readonly string _rootPath;
    private readonly string _publicBasePath;
    private readonly ILogger<LocalFileStorageService> _logger;
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif",
        ".m4a", ".mp3", ".webm", ".wav", ".aac", ".ogg",
        ".pdf", ".doc", ".docx", ".txt"
    };

    private static readonly HashSet<string> AllowedFieldDocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf"
    };

    public LocalFileStorageService(IConfiguration configuration, ILogger<LocalFileStorageService> logger)
    {
        _rootPath = configuration["Storage:LocalPath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        _publicBasePath = configuration["Storage:PublicBasePath"] ?? "/uploads";
        _logger = logger;
        Directory.CreateDirectory(_rootPath);
    }

    public async Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrEmpty(extension) || !AllowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException("File type is not allowed.");
        }

        var storedName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(_rootPath, storedName);

        await using var fileStream = File.Create(fullPath);
        await content.CopyToAsync(fileStream, cancellationToken);

        var url = $"{_publicBasePath.TrimEnd('/')}/{storedName}";
        _logger.LogInformation("Stored file at {Path} as {Url}", fullPath, url);
        return url;
    }

    public async Task<string> SaveFieldDocumentAsync(
        Stream content,
        string fieldId,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrEmpty(extension) || !AllowedFieldDocumentExtensions.Contains(extension))
        {
            throw new InvalidOperationException("Only PDF field documents are allowed.");
        }

        var folder = Path.Combine(_rootPath, "fields", fieldId, "cadastre");
        Directory.CreateDirectory(folder);

        var storedName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(folder, storedName);

        await using var fileStream = File.Create(fullPath);
        await content.CopyToAsync(fileStream, cancellationToken);

        var relativePath = $"{_publicBasePath.TrimEnd('/')}/fields/{fieldId}/cadastre/{storedName}";
        _logger.LogInformation("Stored field document at {Path} as {Url}", fullPath, relativePath);
        return relativePath;
    }

    public async Task<StoredPhotoResult> SavePhotoAsync(
        Stream originalContent,
        Stream thumbnailContent,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrEmpty(extension) || !AllowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException("File type is not allowed.");
        }

        var now = DateTime.UtcNow;
        var folderRelative = Path.Combine("photos", now.ToString("yyyy"), now.ToString("MM"));
        var folder = Path.Combine(_rootPath, folderRelative);
        Directory.CreateDirectory(folder);

        var id = Guid.NewGuid().ToString("N");
        var originalName = $"{id}{extension}";
        var thumbName = $"{id}_thumb.jpg";
        var originalPath = Path.Combine(folder, originalName);
        var thumbPath = Path.Combine(folder, thumbName);

        await using (var fileStream = File.Create(originalPath))
        {
            await originalContent.CopyToAsync(fileStream, cancellationToken);
        }

        await using (var thumbStream = File.Create(thumbPath))
        {
            await thumbnailContent.CopyToAsync(thumbStream, cancellationToken);
        }

        var byteSize = new FileInfo(originalPath).Length;
        var publicFolder = $"{_publicBasePath.TrimEnd('/')}/photos/{now:yyyy}/{now:MM}";
        var url = $"{publicFolder}/{originalName}";
        var thumbUrl = $"{publicFolder}/{thumbName}";
        _logger.LogInformation("Stored photo at {Path} as {Url}", originalPath, url);
        return new StoredPhotoResult(url, thumbUrl, byteSize);
    }

    public Task DeleteAsync(string relativeUrl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(relativeUrl))
        {
            return Task.CompletedTask;
        }

        var fullPath = ResolveSafeFullPath(relativeUrl);
        if (fullPath == null)
        {
            return Task.CompletedTask;
        }

        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            _logger.LogInformation("Deleted stored file {Path}", fullPath);
        }

        return Task.CompletedTask;
    }

    public Task<Stream?> OpenReadAsync(string relativeUrl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(relativeUrl))
        {
            return Task.FromResult<Stream?>(null);
        }

        var fullPath = ResolveSafeFullPath(relativeUrl);
        if (fullPath == null || !File.Exists(fullPath))
        {
            return Task.FromResult<Stream?>(null);
        }

        Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<Stream?>(stream);
    }

    private string? ResolveSafeFullPath(string relativeUrl)
    {
        var relativePath = NormalizeRelativePath(relativeUrl);
        if (relativePath == null)
        {
            return null;
        }

        var fullPath = Path.GetFullPath(Path.Combine(_rootPath, relativePath));
        var rootFull = Path.GetFullPath(_rootPath);
        if (!fullPath.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Refused path outside storage root: {Url}", relativeUrl);
            return null;
        }

        return fullPath;
    }

    private string? NormalizeRelativePath(string relativeUrl)
    {
        var path = relativeUrl.Trim();
        if (Uri.TryCreate(path, UriKind.Absolute, out var absolute)
            && absolute.IsAbsoluteUri
            && !string.IsNullOrEmpty(absolute.Host))
        {
            path = Uri.UnescapeDataString(absolute.AbsolutePath);
        }

        // PublicBasePath may be "/uploads" or "https://api.example/uploads".
        // Compare path segments only — the host is not part of the file path.
        var marker = PublicBasePathMarker(_publicBasePath);
        if (marker.Length > 0)
        {
            var idx = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (idx >= 0)
            {
                path = path[(idx + marker.Length)..];
            }
        }

        path = path.TrimStart('/', '\\')
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar);
        return string.IsNullOrWhiteSpace(path) ? null : path;
    }

    internal static string PublicBasePathMarker(string? publicBasePath)
    {
        var value = string.IsNullOrWhiteSpace(publicBasePath) ? "/uploads" : publicBasePath.Trim();
        if (Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && uri.IsAbsoluteUri
            && !string.IsNullOrEmpty(uri.Host))
        {
            value = uri.AbsolutePath;
        }

        if (!value.StartsWith('/'))
        {
            value = "/" + value;
        }

        return value.TrimEnd('/');
    }
}
