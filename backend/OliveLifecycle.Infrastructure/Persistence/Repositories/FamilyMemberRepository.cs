using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class FamilyMemberRepository
    : MongoRepositoryBase<FamilyMemberDocument, FamilyMember>, IFamilyMemberRepository
{
    public FamilyMemberRepository(MongoDbContext context) : base(context, "family_members")
    {
    }

    protected override FamilyMemberDocument ToDocument(FamilyMember entity) =>
        FamilyMappers.ToDocument(entity);

    protected override FamilyMember ToEntity(FamilyMemberDocument document) =>
        FamilyMappers.ToEntity(document);

    protected override FilterDefinition<FamilyMemberDocument> BuildIdFilter(string id) =>
        Builders<FamilyMemberDocument>.Filter.Eq(m => m.Id, id);

    public async Task<IReadOnlyList<FamilyMember>> GetByCircleIdAsync(
        string circleId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(m => m.CircleId == circleId)
            .SortBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<FamilyMember>> GetByOwnerUserIdAsync(
        string ownerUserId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(m => m.OwnerUserId == ownerUserId)
            .SortBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<FamilyMember?> GetActiveByLinkedUserIdAsync(
        string linkedUserId,
        CancellationToken cancellationToken = default)
    {
        var document = await Collection
            .Find(m => m.LinkedUserId == linkedUserId && m.Status == FamilyMemberStatuses.Active)
            .FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }

    public async Task<IReadOnlyList<FamilyMember>> GetActiveByLinkedUserIdAllAsync(
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
