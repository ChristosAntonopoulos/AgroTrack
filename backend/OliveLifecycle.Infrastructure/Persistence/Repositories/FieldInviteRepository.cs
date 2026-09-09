using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class FieldInviteRepository : IFieldInviteRepository
{
    private readonly IMongoCollection<FieldInviteDocument> _collection;

    public FieldInviteRepository(MongoDbContext context)
    {
        _collection = context.GetCollection<FieldInviteDocument>("field_invites");
    }

    public async Task<FieldInvite> CreateAsync(FieldInvite invite, CancellationToken cancellationToken = default)
    {
        var document = ToDocument(invite);
        await _collection.InsertOneAsync(document, cancellationToken: cancellationToken);
        return ToEntity(document);
    }

    public async Task<FieldInvite?> GetByTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        var document = await _collection.Find(x => x.Token == token).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }

    public async Task<FieldInvite> UpdateAsync(FieldInvite invite, CancellationToken cancellationToken = default)
    {
        invite.UpdatedAt = DateTime.UtcNow;
        var document = ToDocument(invite);
        await _collection.ReplaceOneAsync(x => x.Id == invite.Id, document, cancellationToken: cancellationToken);
        return ToEntity(document);
    }

    public async Task<IEnumerable<FieldInvite>> GetByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var documents = await _collection.Find(x => x.FieldId == fieldId).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    public async Task<IEnumerable<FieldInvite>> GetByInvitedByAsync(string invitedBy, CancellationToken cancellationToken = default)
    {
        var documents = await _collection.Find(x => x.InvitedBy == invitedBy).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    private static FieldInvite ToEntity(FieldInviteDocument doc) => new()
    {
        Id = doc.Id,
        Token = doc.Token,
        FieldId = doc.FieldId,
        FieldName = doc.FieldName,
        InvitedBy = doc.InvitedBy,
        Capacities = doc.Capacities,
        Phone = doc.Phone,
        Email = doc.Email,
        DisplayName = doc.DisplayName,
        Status = doc.Status,
        ExpiresAt = doc.ExpiresAt,
        AcceptedBy = doc.AcceptedBy,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt
    };

    private static FieldInviteDocument ToDocument(FieldInvite entity) => new()
    {
        Id = entity.Id,
        Token = entity.Token,
        FieldId = entity.FieldId,
        FieldName = entity.FieldName,
        InvitedBy = entity.InvitedBy,
        Capacities = entity.Capacities,
        Phone = entity.Phone,
        Email = entity.Email,
        DisplayName = entity.DisplayName,
        Status = entity.Status,
        ExpiresAt = entity.ExpiresAt,
        AcceptedBy = entity.AcceptedBy,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
