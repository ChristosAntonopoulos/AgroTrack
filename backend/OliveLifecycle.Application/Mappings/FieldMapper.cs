using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Mappings;

public static class FieldMapper
{
    public static FieldDto ToDto(Field field) => new()
    {
        Id = field.Id,
        OwnerId = field.OwnerId,
        Name = field.Name,
        Latitude = field.Location?.Latitude,
        Longitude = field.Location?.Longitude,
        Area = field.Area,
        Variety = field.Variety,
        TreeAge = field.TreeAge,
        GroundType = field.GroundType,
        IrrigationStatus = field.IrrigationStatus,
        CurrentLifecycleYear = field.CurrentLifecycleYear,
        CurrentLifecycleStage = OliveLifecycleStage.Normalize(field.CurrentLifecycleStage),
        AssignedProducerIds = field.AssignedProducerIds,
        CreatedAt = field.CreatedAt,
        UpdatedAt = field.UpdatedAt
    };
}
