using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class LifecycleMapper
{
    public static Lifecycle ToEntity(LifecycleDocument document) => new()
    {
        Id = document.Id,
        FieldId = document.FieldId,
        CurrentYear = document.CurrentYear,
        CurrentStage = document.CurrentStage,
        CycleStartDate = document.CycleStartDate,
        LastProgressionDate = document.LastProgressionDate,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static LifecycleDocument ToDocument(Lifecycle entity) => new()
    {
        Id = entity.Id,
        FieldId = entity.FieldId,
        CurrentYear = entity.CurrentYear,
        CurrentStage = entity.CurrentStage,
        CycleStartDate = entity.CycleStartDate,
        LastProgressionDate = entity.LastProgressionDate,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
