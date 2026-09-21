using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

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

    public async Task<FieldInvite?> GetByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return null;
        }

        var normalized = code.Trim().ToUpperInvariant();
        var document = await _collection.Find(x => x.Code == normalized).FirstOrDefaultAsync(cancellationToken);
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

    private static FieldInvite ToEntity(FieldInviteDocument doc)
    {
        var invite = new FieldInvite
        {
            Id = doc.Id,
            Token = doc.Token,
            Code = doc.Code,
            FieldId = doc.FieldId,
            FieldName = doc.FieldName,
            InvitedBy = doc.InvitedBy,
            Role = FieldMapper.InferRole(doc.Role, doc.Capacities),
            Modules = doc.Modules?.ToList() ?? new List<string>(),
            AccessLevel = doc.AccessLevel ?? FamilyAccessLevels.Work,
            Phone = doc.Phone,
            Email = doc.Email,
            DisplayName = doc.DisplayName,
            Status = doc.Status,
            ExpiresAt = doc.ExpiresAt,
            AcceptedBy = doc.AcceptedBy,
            CreatedAt = doc.CreatedAt,
            UpdatedAt = doc.UpdatedAt
        };

        if (invite.Modules.Count == 0)
        {
            invite.Modules = FamilyModules.DefaultOnInvite.ToList();
        }

        return invite;
    }

    private static FieldInviteDocument ToDocument(FieldInvite entity) => new()
    {
        Id = entity.Id,
        Token = entity.Token,
        Code = entity.Code,
        FieldId = entity.FieldId,
        FieldName = entity.FieldName,
        InvitedBy = entity.InvitedBy,
        Role = entity.Role.ToString(),
        Modules = entity.Modules?.ToList() ?? new List<string>(),
        AccessLevel = entity.AccessLevel,
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
