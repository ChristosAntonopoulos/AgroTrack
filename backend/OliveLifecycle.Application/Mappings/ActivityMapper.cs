using OliveLifecycle.Application.DTOs.Activity;
using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Mappings;

public static class ActivityMapper
{
    public static ActivityDto ToDto(Activity activity) => new()
    {
        Id = activity.Id,
        FieldId = activity.FieldId,
        Type = activity.Type,
        Message = activity.Message,
        ActorUserId = activity.ActorUserId,
        TaskId = activity.TaskId,
        Timestamp = activity.Timestamp,
        Metadata = activity.Metadata
    };
}
