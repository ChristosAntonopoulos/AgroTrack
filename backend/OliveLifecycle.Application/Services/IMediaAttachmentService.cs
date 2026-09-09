using OliveLifecycle.Application.DTOs.Media;

namespace OliveLifecycle.Application.Services;

public interface IMediaAttachmentService
{
    Task<IReadOnlyList<MediaAttachmentDto>> AttachUrlsAsync(
        string ownerType,
        string ownerId,
        string fieldId,
        IReadOnlyList<string> urls,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MediaAttachmentDto>> GetByOwnerAsync(
        string ownerType,
        string ownerId,
        CancellationToken cancellationToken = default);
}
