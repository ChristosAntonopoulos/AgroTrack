using OliveLifecycle.Application.DTOs.Photos;

namespace OliveLifecycle.Application.Services;

public interface IPhotoHubService
{
    Task<IReadOnlyList<PhotoUploadResultDto>> UploadAsync(
        IReadOnlyList<PhotoUploadFile> files,
        string userId,
        string userRole,
        bool allowDuplicates = false,
        CancellationToken cancellationToken = default);

    Task<PhotoListDto> QueryAsync(
        PhotoQueryDto query,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<PhotoDto> GetByIdAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<PhotoDto> ConfirmFieldAsync(
        string id,
        ConfirmPhotoFieldDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<PhotoDto> UpdateAsync(
        string id,
        UpdatePhotoDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<PhotoDto> LinkAsync(
        string id,
        LinkPhotoDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<PhotoDto> UnlinkAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    /// <summary>Soft-delete (trash). Requires uploader or field-admin capability.</summary>
    Task DeleteAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<PhotoDto> RestoreAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    /// <summary>Hard-delete a photo that is already in the trash.</summary>
    Task PurgeAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<PhotoContentResult> GetContentBySignatureAsync(
        string id,
        string variant,
        long expUnix,
        string signature,
        string userId,
        CancellationToken cancellationToken = default);

    string CreateSignedUrl(string photoId, string variant, string userId);
}

public sealed class PhotoUploadFile
{
    public required Stream Content { get; init; }
    public required string FileName { get; init; }
    public string? ContentType { get; init; }
    public DateTime? CapturedAt { get; init; }
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
    /// <summary>SHA-256 of the original bytes when the client transcoded HEIC to JPEG.</summary>
    public string? SourceHash { get; init; }
    public bool Transcoded { get; init; }
}
