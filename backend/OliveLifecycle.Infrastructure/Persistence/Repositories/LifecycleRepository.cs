using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class LifecycleRepository : MongoRepositoryBase<LifecycleDocument, Lifecycle>, ILifecycleRepository
{
    public LifecycleRepository(MongoDbContext context) : base(context, "lifecycles")
    {
    }

    protected override LifecycleDocument ToDocument(Lifecycle entity) => LifecycleMapper.ToDocument(entity);
    protected override Lifecycle ToEntity(LifecycleDocument document) => LifecycleMapper.ToEntity(document);
    protected override FilterDefinition<LifecycleDocument> BuildIdFilter(string id) =>
        Builders<LifecycleDocument>.Filter.Eq(l => l.Id, id);

    public async Task<Lifecycle?> GetByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var document = await Collection.Find(l => l.FieldId == fieldId).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }
}
