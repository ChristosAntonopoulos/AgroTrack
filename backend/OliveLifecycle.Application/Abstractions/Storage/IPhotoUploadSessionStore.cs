using OliveLifecycle.Application.Photos;

namespace OliveLifecycle.Application.Abstractions.Storage;

public sealed class PhotoUploadSession
{
    public required string Id { get; init; }
    public required string UserId { get; init; }
    public required string FileName { get; init; }
    public required string ContentType { get; init; }
    public long TotalBytes { get; init; }
    public long ReceivedBytes { get; set; }
}

public readonly record struct PhotoChunkAppendResult(PhotoUploadSession Session, bool Conflict);

public interface IPhotoUploadSessionStore
{
    Task<PhotoUploadSession> CreateAsync(
        string userId,
        string fileName,
        string contentType,
        long totalBytes,
        CancellationToken cancellationToken = default);

    Task<PhotoUploadSession?> GetAsync(
        string uploadId,
        string userId,
        CancellationToken cancellationToken = default);

    Task<PhotoChunkAppendResult> AppendAsync(
        string uploadId,
        string userId,
        long offset,
        Stream content,
        CancellationToken cancellationToken = default);

    Task<Stream?> OpenReadAsync(
        string uploadId,
        string userId,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(
        string uploadId,
        string userId,
        CancellationToken cancellationToken = default);
}
