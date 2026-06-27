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
}
