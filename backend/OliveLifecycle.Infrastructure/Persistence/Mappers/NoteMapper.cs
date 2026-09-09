using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class NoteMapper
{
    public static Note ToEntity(NoteDocument document) => new()
    {
        Id = document.Id,
        OwnerUserId = document.OwnerUserId,
        Body = document.Body,
        FieldId = document.FieldId,
        Pinned = document.Pinned,
        OccurredAt = document.OccurredAt == default ? document.CreatedAt : document.OccurredAt,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static NoteDocument ToDocument(Note entity) => new()
    {
        Id = entity.Id,
        OwnerUserId = entity.OwnerUserId,
        Body = entity.Body,
        FieldId = entity.FieldId,
        Pinned = entity.Pinned,
        OccurredAt = entity.OccurredAt == default ? entity.CreatedAt : entity.OccurredAt,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
