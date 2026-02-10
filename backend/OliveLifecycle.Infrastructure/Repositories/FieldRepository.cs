using MongoDB.Driver;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;

namespace OliveLifecycle.Infrastructure.Repositories;

public class FieldRepository : IFieldRepository
{
    private readonly IMongoCollection<Field> _collection;

    public FieldRepository(MongoDbContext context)
    {
        _collection = context.GetCollection<Field>("fields");
        
        // Create indexes
        var ownerIndex = Builders<Field>.IndexKeys.Ascending(f => f.OwnerId);
        _collection.Indexes.CreateOne(new CreateIndexModel<Field>(ownerIndex));
        
        // Geospatial index for location queries
        var locationIndex = Builders<Field>.IndexKeys.Geo2DSphere("location");
        _collection.Indexes.CreateOne(new CreateIndexModel<Field>(locationIndex));
    }

    public async Task<Field?> GetByIdAsync(string id)
    {
        return await _collection.Find(f => f.Id == id).FirstOrDefaultAsync();
    }

    public async Task<IEnumerable<Field>> GetByOwnerIdAsync(string ownerId)
    {
        return await _collection.Find(f => f.OwnerId == ownerId).ToListAsync();
    }

    public async Task<IEnumerable<Field>> GetByIdsAsync(IEnumerable<string> fieldIds)
    {
        var filter = Builders<Field>.Filter.In(f => f.Id, fieldIds);
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<Field> CreateAsync(Field field)
    {
        await _collection.InsertOneAsync(field);
        return field;
    }

    public async Task<Field> UpdateAsync(Field field)
    {
        field.UpdatedAt = DateTime.UtcNow;
        await _collection.ReplaceOneAsync(f => f.Id == field.Id, field);
        return field;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _collection.DeleteOneAsync(f => f.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<bool> ExistsAsync(string id)
    {
        var count = await _collection.CountDocumentsAsync(f => f.Id == id);
        return count > 0;
    }
}
