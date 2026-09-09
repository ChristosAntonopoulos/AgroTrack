using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class SavedContactMapper
{
    public static SavedContact ToEntity(SavedContactDocument document) => new()
    {
        Id = document.Id,
        OwnerUserId = document.OwnerUserId,
        DisplayName = document.DisplayName,
        Phone = document.Phone,
        Email = document.Email,
        Notes = document.Notes,
        ServiceCategoryIds = document.ServiceCategoryIds ?? new List<string>(),
        FieldIds = document.FieldIds ?? new List<string>(),
        LinkedUserId = document.LinkedUserId,
        Source = Enum.TryParse<SavedContactSource>(document.Source, true, out var source)
            ? source
            : SavedContactSource.Manual,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static SavedContactDocument ToDocument(SavedContact entity) => new()
    {
        Id = entity.Id,
        OwnerUserId = entity.OwnerUserId,
        DisplayName = entity.DisplayName,
        Phone = entity.Phone,
        Email = entity.Email,
        Notes = entity.Notes,
        ServiceCategoryIds = entity.ServiceCategoryIds,
        FieldIds = entity.FieldIds,
        LinkedUserId = entity.LinkedUserId,
        Source = entity.Source.ToString(),
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
