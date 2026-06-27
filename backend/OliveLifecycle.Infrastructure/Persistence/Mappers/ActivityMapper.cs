using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class ActivityMapper
{
    public static Activity ToEntity(ActivityDocument document) => new()
    {
        Id = document.Id,
        FieldId = document.FieldId,
        Type = document.Type,
        Message = document.Message,
        ActorUserId = document.ActorUserId,
        TaskId = document.TaskId,
        Timestamp = document.Timestamp,
        Metadata = document.Metadata,
        CreatedAt = document.Timestamp,
        UpdatedAt = document.Timestamp
    };

    public static ActivityDocument ToDocument(Activity entity) => new()
    {
        Id = entity.Id,
        FieldId = entity.FieldId,
        Type = entity.Type,
        Message = entity.Message,
        ActorUserId = entity.ActorUserId,
        TaskId = entity.TaskId,
        Timestamp = entity.Timestamp,
        Metadata = entity.Metadata
    };
}
