using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IMediaAttachmentRepository : IRepository<MediaAttachment, string>
{
    Task<IReadOnlyList<MediaAttachment>> GetByOwnerAsync(
        MediaOwnerType ownerType,
        string ownerId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MediaAttachment>> GetByOwnersAsync(
        MediaOwnerType ownerType,
        IEnumerable<string> ownerIds,
        CancellationToken cancellationToken = default);

    Task<int> CountByOwnerAsync(
        MediaOwnerType ownerType,
        string ownerId,
        CancellationToken cancellationToken = default);
}
