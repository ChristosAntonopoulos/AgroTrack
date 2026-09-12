namespace OliveLifecycle.Application.Abstractions.Storage;

public interface IFileStorageService
{
    Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken cancellationToken = default);
    Task<string> SaveFieldDocumentAsync(Stream content, string fieldId, string fileName, string contentType, CancellationToken cancellationToken = default);
    Task<StoredPhotoResult> SavePhotoAsync(
        Stream originalContent,
        Stream thumbnailContent,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default);
    Task DeleteAsync(string relativeUrl, CancellationToken cancellationToken = default);
}

public sealed record StoredPhotoResult(string Url, string ThumbnailUrl, long ByteSize);
