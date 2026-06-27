using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class FieldMapper
{
    public static Field ToEntity(FieldDocument document) => new()
    {
        Id = document.Id,
        OwnerId = document.OwnerId,
        Name = document.Name,
        Location = document.Location == null
            ? null
            : new Location
            {
                Latitude = document.Location.Latitude,
                Longitude = document.Location.Longitude
            },
        Area = document.Area,
        Variety = document.Variety,
        TreeAge = document.TreeAge,
        GroundType = document.GroundType,
        IrrigationStatus = document.IrrigationStatus,
        CurrentLifecycleYear = document.CurrentLifecycleYear,
        CurrentLifecycleStage = document.CurrentLifecycleStage,
        AssignedProducerIds = document.AssignedProducerIds,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static FieldDocument ToDocument(Field entity) => new()
    {
        Id = entity.Id,
        OwnerId = entity.OwnerId,
        Name = entity.Name,
        Location = entity.Location == null
            ? null
            : new LocationDocument
            {
                Latitude = entity.Location.Latitude,
                Longitude = entity.Location.Longitude
            },
        Area = entity.Area,
        Variety = entity.Variety,
        TreeAge = entity.TreeAge,
        GroundType = entity.GroundType,
        IrrigationStatus = entity.IrrigationStatus,
        CurrentLifecycleYear = entity.CurrentLifecycleYear,
        CurrentLifecycleStage = entity.CurrentLifecycleStage,
        AssignedProducerIds = entity.AssignedProducerIds,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
