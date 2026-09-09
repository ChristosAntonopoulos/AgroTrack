using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class SavedContactRepository
    : MongoRepositoryBase<SavedContactDocument, SavedContact>, ISavedContactRepository
{
    public SavedContactRepository(MongoDbContext context) : base(context, "saved_contacts")
    {
    }

    protected override SavedContactDocument ToDocument(SavedContact entity) =>
        SavedContactMapper.ToDocument(entity);

    protected override SavedContact ToEntity(SavedContactDocument document) =>
        SavedContactMapper.ToEntity(document);

    protected override FilterDefinition<SavedContactDocument> BuildIdFilter(string id) =>
        Builders<SavedContactDocument>.Filter.Eq(c => c.Id, id);

    public async Task<IReadOnlyList<SavedContact>> GetByOwnerUserIdAsync(
        string ownerUserId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(c => c.OwnerUserId == ownerUserId)
            .SortBy(c => c.DisplayName)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}
