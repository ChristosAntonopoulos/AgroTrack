using OliveLifecycle.Application.DTOs.Photos;

namespace OliveLifecycle.Application.Services;

public interface IPhotoHubService
{
    Task<IReadOnlyList<PhotoUploadResultDto>> UploadAsync(
        IReadOnlyList<PhotoUploadFile> files,
        string userId,
        string userRole,
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

    Task DeleteAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);
}

public sealed class PhotoUploadFile
{
    public required Stream Content { get; init; }
    public required string FileName { get; init; }
    public string? ContentType { get; init; }
}
