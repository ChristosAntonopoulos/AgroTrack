using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class OwnerPartnerInviteRepository
    : MongoRepositoryBase<OwnerPartnerInviteDocument, OwnerPartnerInvite>, IOwnerPartnerInviteRepository
{
    public OwnerPartnerInviteRepository(MongoDbContext context) : base(context, "owner_partner_invites")
    {
    }

    protected override OwnerPartnerInviteDocument ToDocument(OwnerPartnerInvite entity) =>
        OwnerPartnerMappers.ToDocument(entity);

    protected override OwnerPartnerInvite ToEntity(OwnerPartnerInviteDocument document) =>
        OwnerPartnerMappers.ToEntity(document);

    protected override FilterDefinition<OwnerPartnerInviteDocument> BuildIdFilter(string id) =>
        Builders<OwnerPartnerInviteDocument>.Filter.Eq(i => i.Id, id);

    public async Task<OwnerPartnerInvite?> GetByTokenAsync(
        string token,
        CancellationToken cancellationToken = default)
    {
        var raw = (token ?? string.Empty).Trim();
        if (raw.Length == 0)
        {
            return null;
        }

        var tokenLower = raw.ToLowerInvariant();
        var code = FamilyInviteCodes.Normalize(raw);
        var filter = Builders<OwnerPartnerInviteDocument>.Filter.Eq(i => i.Token, tokenLower);
        if (code.Length == FamilyInviteCodes.Length)
        {
            filter = Builders<OwnerPartnerInviteDocument>.Filter.Or(
                filter,
                Builders<OwnerPartnerInviteDocument>.Filter.Eq(i => i.Code, code));
        }

        var document = await Collection.Find(filter).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }

    public async Task<IReadOnlyList<OwnerPartnerInvite>> GetPendingByOwnerUserIdAsync(
        string ownerUserId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(i => i.OwnerUserId == ownerUserId && i.Status == FamilyInviteStatuses.Pending)
            .SortByDescending(i => i.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}
