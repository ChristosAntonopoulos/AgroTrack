using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class MediaAttachmentRepository
    : MongoRepositoryBase<MediaAttachmentDocument, MediaAttachment>, IMediaAttachmentRepository
{
    public MediaAttachmentRepository(MongoDbContext context) : base(context, "media_attachments")
    {
    }

    protected override MediaAttachmentDocument ToDocument(MediaAttachment entity) =>
        MediaAttachmentMapper.ToDocument(entity);

    protected override MediaAttachment ToEntity(MediaAttachmentDocument document) =>
        MediaAttachmentMapper.ToEntity(document);

    protected override FilterDefinition<MediaAttachmentDocument> BuildIdFilter(string id) =>
        Builders<MediaAttachmentDocument>.Filter.Eq(m => m.Id, id);

    public async Task<IReadOnlyList<MediaAttachment>> GetByOwnerAsync(
        MediaOwnerType ownerType,
        string ownerId,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<MediaAttachmentDocument>.Filter.Eq(m => m.OwnerType, ownerType.ToApiString())
            & Builders<MediaAttachmentDocument>.Filter.Eq(m => m.OwnerId, ownerId);

        var documents = await Collection
            .Find(filter)
            .SortBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<MediaAttachment>> GetByOwnersAsync(
        MediaOwnerType ownerType,
        IEnumerable<string> ownerIds,
        CancellationToken cancellationToken = default)
    {
        var ids = ownerIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList();
        if (ids.Count == 0)
        {
            return Array.Empty<MediaAttachment>();
        }

        var filter = Builders<MediaAttachmentDocument>.Filter.Eq(m => m.OwnerType, ownerType.ToApiString())
            & Builders<MediaAttachmentDocument>.Filter.In(m => m.OwnerId, ids);

        var documents = await Collection
            .Find(filter)
            .SortBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        return documents.Select(ToEntity).ToList();
    }

    public async Task<int> CountByOwnerAsync(
        MediaOwnerType ownerType,
        string ownerId,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<MediaAttachmentDocument>.Filter.Eq(m => m.OwnerType, ownerType.ToApiString())
            & Builders<MediaAttachmentDocument>.Filter.Eq(m => m.OwnerId, ownerId);
        return (int)await Collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
    }
}
