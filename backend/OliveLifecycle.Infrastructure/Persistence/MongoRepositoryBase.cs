using MongoDB.Bson;
using MongoDB.Driver;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;

namespace OliveLifecycle.Infrastructure.Persistence;

public abstract class MongoRepositoryBase<TDocument, TEntity> where TEntity : BaseEntity
{
    protected IMongoCollection<TDocument> Collection { get; }

    protected MongoRepositoryBase(MongoDbContext context, string collectionName)
    {
        Collection = context.GetCollection<TDocument>(collectionName);
    }

    protected abstract TDocument ToDocument(TEntity entity);
    protected abstract TEntity ToEntity(TDocument document);
    protected abstract FilterDefinition<TDocument> BuildIdFilter(string id);

    public virtual async Task<TEntity?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var document = await Collection.Find(BuildIdFilter(id)).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }

    public virtual async Task<TEntity> CreateAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(entity.Id))
        {
            entity.Id = ObjectId.GenerateNewId().ToString();
        }

        var document = ToDocument(entity);
        await Collection.InsertOneAsync(document, cancellationToken: cancellationToken);
        return ToEntity(document);
    }

    public virtual async Task<TEntity> UpdateAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        var document = ToDocument(entity);
        await Collection.ReplaceOneAsync(BuildIdFilter(entity.Id), document, cancellationToken: cancellationToken);
        return ToEntity(document);
    }

    public virtual async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var result = await Collection.DeleteOneAsync(BuildIdFilter(id), cancellationToken);
        return result.DeletedCount > 0;
    }
}
