using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class OwnerPartnerLinkRepository
    : MongoRepositoryBase<OwnerPartnerLinkDocument, OwnerPartnerLink>, IOwnerPartnerLinkRepository
{
    public OwnerPartnerLinkRepository(MongoDbContext context) : base(context, "owner_partner_links")
    {
    }

    protected override OwnerPartnerLinkDocument ToDocument(OwnerPartnerLink entity) =>
        OwnerPartnerMappers.ToDocument(entity);

    protected override OwnerPartnerLink ToEntity(OwnerPartnerLinkDocument document) =>
        OwnerPartnerMappers.ToEntity(document);

    protected override FilterDefinition<OwnerPartnerLinkDocument> BuildIdFilter(string id) =>
        Builders<OwnerPartnerLinkDocument>.Filter.Eq(m => m.Id, id);

    public async Task<IReadOnlyList<OwnerPartnerLink>> GetByOwnerUserIdAsync(
        string ownerUserId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(m => m.OwnerUserId == ownerUserId)
            .SortBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<OwnerPartnerLink?> GetActiveByLinkedUserIdAsync(
        string linkedUserId,
        CancellationToken cancellationToken = default)
    {
        var document = await Collection
            .Find(m => m.LinkedUserId == linkedUserId && m.Status == FamilyMemberStatuses.Active)
            .FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }

    public async Task<IReadOnlyList<OwnerPartnerLink>> GetActiveByLinkedUserIdAllAsync(
        string linkedUserId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(m => m.LinkedUserId == linkedUserId && m.Status == FamilyMemberStatuses.Active)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<int> CountOccupiedSeatsAsync(
        string ownerUserId,
        CancellationToken cancellationToken = default)
    {
        return (int)await Collection.CountDocumentsAsync(
            m => m.OwnerUserId == ownerUserId
                 && (m.Status == FamilyMemberStatuses.Pending || m.Status == FamilyMemberStatuses.Active),
            cancellationToken: cancellationToken);
    }
}
