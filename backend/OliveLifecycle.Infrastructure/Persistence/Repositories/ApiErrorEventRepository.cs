using MongoDB.Bson;
using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class ApiErrorEventRepository
    : MongoRepositoryBase<ApiErrorEventDocument, ApiErrorEvent>, IApiErrorEventRepository
{
    public ApiErrorEventRepository(MongoDbContext context) : base(context, "api_error_events")
    {
    }

    protected override ApiErrorEventDocument ToDocument(ApiErrorEvent entity) =>
        ApiErrorEventMapper.ToDocument(entity);

    protected override ApiErrorEvent ToEntity(ApiErrorEventDocument document) =>
        ApiErrorEventMapper.ToEntity(document);

    protected override FilterDefinition<ApiErrorEventDocument> BuildIdFilter(string id) =>
        Builders<ApiErrorEventDocument>.Filter.Eq(e => e.Id, id);

    public async Task<(IReadOnlyList<ApiErrorEvent> Items, int Total)> GetPageAsync(
        int page,
        int pageSize,
        DateTime? sinceUtc,
        string? pathPrefix,
        int? statusCode,
        bool? unacknowledgedOnly,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var filter = BuildFilter(sinceUtc, pathPrefix, statusCode, unacknowledgedOnly);
        var total = (int)await Collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        var documents = await Collection
            .Find(filter)
            .SortByDescending(e => e.OccurredAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync(cancellationToken);
        return (documents.Select(ToEntity).ToList(), total);
    }

    public async Task<int> CountSinceAsync(DateTime sinceUtc, CancellationToken cancellationToken = default)
    {
        var filter = Builders<ApiErrorEventDocument>.Filter.Gte(e => e.OccurredAt, sinceUtc);
        return (int)await Collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
    }

    public async Task<int> CountUnacknowledgedAsync(CancellationToken cancellationToken = default)
    {
        var filter = Builders<ApiErrorEventDocument>.Filter.Eq(e => e.AcknowledgedAt, null);
        return (int)await Collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
    }

    private static FilterDefinition<ApiErrorEventDocument> BuildFilter(
        DateTime? sinceUtc,
        string? pathPrefix,
        int? statusCode,
        bool? unacknowledgedOnly)
    {
        var filters = new List<FilterDefinition<ApiErrorEventDocument>>();
        if (sinceUtc.HasValue)
        {
            filters.Add(Builders<ApiErrorEventDocument>.Filter.Gte(e => e.OccurredAt, sinceUtc.Value));
        }

        if (!string.IsNullOrWhiteSpace(pathPrefix))
        {
            var prefix = pathPrefix.Trim();
            filters.Add(Builders<ApiErrorEventDocument>.Filter.Regex(
                e => e.Path,
                new BsonRegularExpression("^" + System.Text.RegularExpressions.Regex.Escape(prefix))));
        }

        if (statusCode.HasValue)
        {
            filters.Add(Builders<ApiErrorEventDocument>.Filter.Eq(e => e.StatusCode, statusCode.Value));
        }

        if (unacknowledgedOnly == true)
        {
            filters.Add(Builders<ApiErrorEventDocument>.Filter.Eq(e => e.AcknowledgedAt, null));
        }

        return filters.Count == 0
            ? FilterDefinition<ApiErrorEventDocument>.Empty
            : Builders<ApiErrorEventDocument>.Filter.And(filters);
    }
}
