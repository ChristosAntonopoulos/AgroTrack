using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class FamilyInviteRepository
    : MongoRepositoryBase<FamilyInviteDocument, FamilyInvite>, IFamilyInviteRepository
{
    public FamilyInviteRepository(MongoDbContext context) : base(context, "family_invites")
    {
    }

    protected override FamilyInviteDocument ToDocument(FamilyInvite entity) =>
        FamilyMappers.ToDocument(entity);

    protected override FamilyInvite ToEntity(FamilyInviteDocument document) =>
        FamilyMappers.ToEntity(document);

    protected override FilterDefinition<FamilyInviteDocument> BuildIdFilter(string id) =>
        Builders<FamilyInviteDocument>.Filter.Eq(i => i.Id, id);

    public async Task<FamilyInvite?> GetByTokenAsync(
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
        var filter = Builders<FamilyInviteDocument>.Filter.Eq(i => i.Token, tokenLower);
        if (code.Length == FamilyInviteCodes.Length)
        {
            filter = Builders<FamilyInviteDocument>.Filter.Or(
                filter,
                Builders<FamilyInviteDocument>.Filter.Eq(i => i.Code, code));
        }

        var document = await Collection.Find(filter).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }

    public async Task<IReadOnlyList<FamilyInvite>> GetPendingByCircleIdAsync(
        string circleId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(i => i.CircleId == circleId && i.Status == FamilyInviteStatuses.Pending)
            .SortByDescending(i => i.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}
