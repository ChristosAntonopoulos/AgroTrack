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

    Task<(IReadOnlyList<MediaAttachment> Items, int TotalCount)> QueryAsync(
        MediaAttachmentQuery query,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MediaAttachment>> FindByContentHashAsync(
        string contentHash,
        string? fieldId,
        CancellationToken cancellationToken = default);

    /// <summary>Standalone hub photos (OwnerType=Field) for Chronologio timeline.</summary>
    Task<IReadOnlyList<MediaAttachment>> GetStandaloneByFieldIdsAsync(
        IEnumerable<string> fieldIds,
        DateTime? from,
        DateTime? to,
        CancellationToken cancellationToken = default);

    /// <summary>Hard-delete trashed rows older than cutoff. Returns count removed.</summary>
    Task<int> PurgeTrashedOlderThanAsync(
        DateTime cutoffUtc,
        CancellationToken cancellationToken = default);
}

public sealed class MediaAttachmentQuery
{
    public IReadOnlyList<string>? AccessibleFieldIds { get; init; }
    public string? FieldId { get; init; }
    public string? UploadedByUserIdForUnassigned { get; init; }
    public DateTime? From { get; init; }
    public DateTime? To { get; init; }
    public FieldAssignmentStatus? FieldAssignment { get; init; }
    public MediaOwnerType? OwnerType { get; init; }
    public bool? LinkedOnly { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 48;
}
