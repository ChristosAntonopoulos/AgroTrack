using OliveLifecycle.Application.DTOs.Lifecycle;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Mappings;

public static class LifecycleMapper
{
    public static LifecycleDto ToDto(Lifecycle lifecycle) => new()
    {
        Id = lifecycle.Id,
        FieldId = lifecycle.FieldId,
        CurrentYear = lifecycle.CurrentYear,
        CurrentStage = OliveLifecycleStage.Normalize(lifecycle.CurrentStage),
        CycleStartDate = lifecycle.CycleStartDate,
        LastProgressionDate = lifecycle.LastProgressionDate,
        CreatedAt = lifecycle.CreatedAt,
        UpdatedAt = lifecycle.UpdatedAt
    };
}
