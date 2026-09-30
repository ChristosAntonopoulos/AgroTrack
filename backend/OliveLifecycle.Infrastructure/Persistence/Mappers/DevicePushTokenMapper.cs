using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class DevicePushTokenMapper
{
    public static DevicePushToken ToEntity(DevicePushTokenDocument document) => new()
    {
        Id = document.Id,
        UserId = document.UserId,
        Platform = document.Platform,
        ExpoPushToken = document.ExpoPushToken,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static DevicePushTokenDocument ToDocument(DevicePushToken entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        Platform = entity.Platform,
        ExpoPushToken = entity.ExpoPushToken,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
