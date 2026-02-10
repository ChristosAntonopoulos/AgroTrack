using MongoDB.Driver;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;

namespace OliveLifecycle.Infrastructure.Repositories;

public class LifecycleRepository : ILifecycleRepository
{
    private readonly IMongoCollection<Lifecycle> _collection;

    public LifecycleRepository(MongoDbContext context)
    {
        _collection = context.GetCollection<Lifecycle>("lifecycles");
        
        // Create unique index on fieldId
        var indexOptions = new CreateIndexOptions { Unique = true };
        var indexDefinition = Builders<Lifecycle>.IndexKeys.Ascending(l => l.FieldId);
        _collection.Indexes.CreateOne(new CreateIndexModel<Lifecycle>(indexDefinition, indexOptions));
    }

    public async Task<Lifecycle?> GetByFieldIdAsync(string fieldId)
    {
        return await _collection.Find(l => l.FieldId == fieldId).FirstOrDefaultAsync();
    }

    public async Task<Lifecycle> CreateAsync(Lifecycle lifecycle)
    {
        await _collection.InsertOneAsync(lifecycle);
        return lifecycle;
    }

    public async Task<Lifecycle> UpdateAsync(Lifecycle lifecycle)
    {
        lifecycle.UpdatedAt = DateTime.UtcNow;
        await _collection.ReplaceOneAsync(l => l.Id == lifecycle.Id, lifecycle);
        return lifecycle;
    }
}
