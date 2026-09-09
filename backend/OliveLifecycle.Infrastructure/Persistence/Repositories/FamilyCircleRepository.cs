using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class FamilyCircleRepository
    : MongoRepositoryBase<FamilyCircleDocument, FamilyCircle>, IFamilyCircleRepository
{
    public FamilyCircleRepository(MongoDbContext context) : base(context, "family_circles")
    {
    }

    protected override FamilyCircleDocument ToDocument(FamilyCircle entity) =>
        FamilyMappers.ToDocument(entity);

    protected override FamilyCircle ToEntity(FamilyCircleDocument document) =>
        FamilyMappers.ToEntity(document);

    protected override FilterDefinition<FamilyCircleDocument> BuildIdFilter(string id) =>
        Builders<FamilyCircleDocument>.Filter.Eq(c => c.Id, id);

    public async Task<FamilyCircle?> GetByOwnerUserIdAsync(
        string ownerUserId,
        CancellationToken cancellationToken = default)
    {
        var document = await Collection
            .Find(c => c.OwnerUserId == ownerUserId)
            .FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }
}
