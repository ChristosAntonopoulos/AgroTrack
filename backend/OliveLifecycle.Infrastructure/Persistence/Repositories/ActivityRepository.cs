using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class ActivityRepository : IActivityRepository
{
    private readonly IMongoCollection<ActivityDocument> _collection;

    public ActivityRepository(MongoDbContext context)
    {
        _collection = context.GetCollection<ActivityDocument>("activities");
    }

    public async Task<Activity> CreateAsync(Activity activity, CancellationToken cancellationToken = default)
    {
        var document = ActivityMapper.ToDocument(activity);
        await _collection.InsertOneAsync(document, cancellationToken: cancellationToken);
        return ActivityMapper.ToEntity(document);
    }

    public async Task<IEnumerable<Activity>> GetByFieldIdAsync(string fieldId, int limit = 50, CancellationToken cancellationToken = default)
    {
        var documents = await _collection
            .Find(a => a.FieldId == fieldId)
            .SortByDescending(a => a.Timestamp)
            .Limit(limit)
            .ToListAsync(cancellationToken);

        return documents.Select(ActivityMapper.ToEntity);
    }

    public async Task<IEnumerable<Activity>> GetByActorUserIdAsync(
        string actorUserId,
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        int limit = 200,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<ActivityDocument>.Filter.Eq(a => a.ActorUserId, actorUserId);
        if (fromUtc.HasValue)
        {
            filter &= Builders<ActivityDocument>.Filter.Gte(a => a.Timestamp, fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            filter &= Builders<ActivityDocument>.Filter.Lt(a => a.Timestamp, toUtc.Value);
        }

        var documents = await _collection
            .Find(filter)
            .SortByDescending(a => a.Timestamp)
            .Limit(limit)
            .ToListAsync(cancellationToken);

        return documents.Select(ActivityMapper.ToEntity);
    }

    public async Task<IEnumerable<Activity>> GetByFieldIdsAsync(
        IEnumerable<string> fieldIds,
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var ids = fieldIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0)
        {
            return Enumerable.Empty<Activity>();
        }

        var filter = Builders<ActivityDocument>.Filter.In(a => a.FieldId, ids);
        if (fromUtc.HasValue)
        {
            filter &= Builders<ActivityDocument>.Filter.Gte(a => a.Timestamp, fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            filter &= Builders<ActivityDocument>.Filter.Lt(a => a.Timestamp, toUtc.Value);
        }

        var documents = await _collection
            .Find(filter)
            .SortByDescending(a => a.Timestamp)
            .Limit(limit)
            .ToListAsync(cancellationToken);

        return documents.Select(ActivityMapper.ToEntity);
    }
}
