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
        var filter = NotDeletedFilter()
            & Builders<MediaAttachmentDocument>.Filter.Eq(m => m.OwnerType, ownerType.ToApiString())
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

        var filter = NotDeletedFilter()
            & Builders<MediaAttachmentDocument>.Filter.Eq(m => m.OwnerType, ownerType.ToApiString())
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
        var filter = NotDeletedFilter()
            & Builders<MediaAttachmentDocument>.Filter.Eq(m => m.OwnerType, ownerType.ToApiString())
            & Builders<MediaAttachmentDocument>.Filter.Eq(m => m.OwnerId, ownerId);
        return (int)await Collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
    }

    public async Task<(IReadOnlyList<MediaAttachment> Items, int TotalCount)> QueryAsync(
        MediaAttachmentQuery query,
        CancellationToken cancellationToken = default)
    {
        var filter = BuildQueryFilter(query);
        var total = (int)await Collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var skip = (page - 1) * pageSize;

        var oldest = string.Equals(query.Sort, "oldest", StringComparison.OrdinalIgnoreCase);
        var sort = query.TrashedOnly
            ? Builders<MediaAttachmentDocument>.Sort.Descending(m => m.DeletedAt)
            : oldest
                ? Builders<MediaAttachmentDocument>.Sort
                    .Ascending(m => m.CapturedAt)
                    .Ascending(m => m.CreatedAt)
                : Builders<MediaAttachmentDocument>.Sort
                    .Descending(m => m.CapturedAt)
                    .Descending(m => m.CreatedAt);

        var documents = await Collection
            .Find(filter)
            .Sort(sort)
            .Skip(skip)
            .Limit(pageSize)
            .ToListAsync(cancellationToken);

        return (documents.Select(ToEntity).ToList(), total);
    }

    public async Task<IReadOnlyList<MediaAttachment>> FindByContentHashAsync(
        string contentHash,
        string? fieldId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(contentHash))
        {
            return Array.Empty<MediaAttachment>();
        }

        var filter = NotDeletedFilter()
            & Builders<MediaAttachmentDocument>.Filter.Eq(m => m.ContentHash, contentHash);
        if (!string.IsNullOrWhiteSpace(fieldId))
        {
            filter &= Builders<MediaAttachmentDocument>.Filter.Eq(m => m.FieldId, fieldId);
        }

        var documents = await Collection.Find(filter).Limit(25).ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<MediaAttachment>> GetStandaloneByFieldIdsAsync(
        IEnumerable<string> fieldIds,
        DateTime? from,
        DateTime? to,
        CancellationToken cancellationToken = default)
    {
        var ids = fieldIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList();
        if (ids.Count == 0)
        {
            return Array.Empty<MediaAttachment>();
        }

        var builder = Builders<MediaAttachmentDocument>.Filter;
        var filter = NotDeletedFilter()
            & builder.In(m => m.FieldId, ids)
            & builder.Eq(m => m.OwnerType, MediaOwnerType.Field.ToApiString());

        if (from.HasValue)
        {
            filter &= builder.Or(
                builder.Gte(m => m.CapturedAt, from.Value),
                builder.And(
                    builder.Eq(m => m.CapturedAt, (DateTime?)null),
                    builder.Gte(m => m.CreatedAt, from.Value)));
        }

        if (to.HasValue)
        {
            filter &= builder.Or(
                builder.Lte(m => m.CapturedAt, to.Value),
                builder.And(
                    builder.Eq(m => m.CapturedAt, (DateTime?)null),
                    builder.Lte(m => m.CreatedAt, to.Value)));
        }

        var documents = await Collection
            .Find(filter)
            .Sort(Builders<MediaAttachmentDocument>.Sort
                .Descending(m => m.CapturedAt)
                .Descending(m => m.CreatedAt))
            .Limit(500)
            .ToListAsync(cancellationToken);

        return documents.Select(ToEntity).ToList();
    }

    public async Task<int> PurgeTrashedOlderThanAsync(
        DateTime cutoffUtc,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<MediaAttachmentDocument>.Filter.Ne(m => m.DeletedAt, (DateTime?)null)
            & Builders<MediaAttachmentDocument>.Filter.Lt(m => m.DeletedAt, cutoffUtc);
        var result = await Collection.DeleteManyAsync(filter, cancellationToken);
        return (int)result.DeletedCount;
    }

    private static FilterDefinition<MediaAttachmentDocument> NotDeletedFilter() =>
        Builders<MediaAttachmentDocument>.Filter.Eq(m => m.DeletedAt, (DateTime?)null)
        | Builders<MediaAttachmentDocument>.Filter.Exists(m => m.DeletedAt, false);

    private static FilterDefinition<MediaAttachmentDocument> TrashedFilter() =>
        Builders<MediaAttachmentDocument>.Filter.Ne(m => m.DeletedAt, (DateTime?)null);

    private static FilterDefinition<MediaAttachmentDocument> BuildQueryFilter(MediaAttachmentQuery query)
    {
        var filters = new List<FilterDefinition<MediaAttachmentDocument>>
        {
            query.TrashedOnly ? TrashedFilter() : NotDeletedFilter()
        };
        var builder = Builders<MediaAttachmentDocument>.Filter;

        if (!string.IsNullOrWhiteSpace(query.FieldId))
        {
            filters.Add(builder.Eq(m => m.FieldId, query.FieldId.Trim()));
        }
        else if (query.AccessibleFieldIds != null)
        {
            var fieldIds = query.AccessibleFieldIds
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            var accessParts = new List<FilterDefinition<MediaAttachmentDocument>>();
            if (fieldIds.Count > 0)
            {
                accessParts.Add(builder.In(m => m.FieldId, fieldIds));
            }

            if (!string.IsNullOrWhiteSpace(query.UploadedByUserIdForUnassigned))
            {
                accessParts.Add(
                    builder.Eq(m => m.FieldAssignment, FieldAssignmentStatus.Unassigned.ToApiString())
                    & builder.Eq(m => m.UploadedByUserId, query.UploadedByUserIdForUnassigned)
                    & (builder.Eq(m => m.FieldId, string.Empty) | builder.Eq(m => m.FieldId, (string?)null)));
            }

            filters.Add(accessParts.Count > 0
                ? builder.Or(accessParts)
                : builder.Eq(m => m.Id, "__none__"));
        }

        if (query.From.HasValue)
        {
            filters.Add(builder.Or(
                builder.Gte(m => m.CapturedAt, query.From.Value),
                builder.And(
                    builder.Eq(m => m.CapturedAt, (DateTime?)null),
                    builder.Gte(m => m.CreatedAt, query.From.Value))));
        }

        if (query.To.HasValue)
        {
            filters.Add(builder.Or(
                builder.Lte(m => m.CapturedAt, query.To.Value),
                builder.And(
                    builder.Eq(m => m.CapturedAt, (DateTime?)null),
                    builder.Lte(m => m.CreatedAt, query.To.Value))));
        }

        if (query.FieldAssignment.HasValue)
        {
            filters.Add(builder.Eq(m => m.FieldAssignment, query.FieldAssignment.Value.ToApiString()));
        }

        if (query.OwnerType.HasValue)
        {
            filters.Add(builder.Eq(m => m.OwnerType, query.OwnerType.Value.ToApiString()));
        }

        if (query.LinkedOnly == true)
        {
            filters.Add(builder.Ne(m => m.OwnerType, MediaOwnerType.Field.ToApiString()));
        }
        else if (query.LinkedOnly == false)
        {
            filters.Add(builder.Eq(m => m.OwnerType, MediaOwnerType.Field.ToApiString()));
        }

        return filters.Count == 0 ? builder.Empty : builder.And(filters);
    }
}
