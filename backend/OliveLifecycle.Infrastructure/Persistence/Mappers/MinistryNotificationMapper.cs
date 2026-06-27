using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class MinistryNotificationMapper
{
    public static MinistryNotification ToEntity(MinistryNotificationDocument document) => new()
    {
        Id = document.Id,
        Title = document.Title,
        Message = document.Message,
        Type = document.Type,
        Priority = document.Priority,
        PublishedAt = document.PublishedAt,
        ExpirationDate = document.ExpirationDate,
        Category = document.Category,
        TargetRoles = document.TargetRoles,
        ActionUrl = document.ActionUrl,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static MinistryNotificationDocument ToDocument(MinistryNotification entity) => new()
    {
        Id = entity.Id,
        Title = entity.Title,
        Message = entity.Message,
        Type = entity.Type,
        Priority = entity.Priority,
        PublishedAt = entity.PublishedAt,
        ExpirationDate = entity.ExpirationDate,
        Category = entity.Category,
        TargetRoles = entity.TargetRoles,
        ActionUrl = entity.ActionUrl,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static MinistryNotificationRead ToReadEntity(MinistryNotificationReadDocument document) => new()
    {
        Id = document.Id,
        UserId = document.UserId,
        NotificationId = document.NotificationId,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static MinistryNotificationReadDocument ToReadDocument(MinistryNotificationRead entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        NotificationId = entity.NotificationId,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}

public static class HarvestRecordMapper
{
    public static HarvestRecord ToEntity(HarvestRecordDocument document) => new()
    {
        Id = document.Id,
        FieldId = document.FieldId,
        OwnerId = document.OwnerId,
        HarvestDate = document.HarvestDate,
        HarvestMethod = document.HarvestMethod,
        WorkersUsed = document.WorkersUsed,
        OliveKg = document.OliveKg,
        MillName = document.MillName,
        OilKg = document.OilKg,
        OilYieldPercent = document.OilYieldPercent,
        QualityGrade = document.QualityGrade,
        Notes = document.Notes,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static HarvestRecordDocument ToDocument(HarvestRecord entity) => new()
    {
        Id = entity.Id,
        FieldId = entity.FieldId,
        OwnerId = entity.OwnerId,
        HarvestDate = entity.HarvestDate,
        HarvestMethod = entity.HarvestMethod,
        WorkersUsed = entity.WorkersUsed,
        OliveKg = entity.OliveKg,
        MillName = entity.MillName,
        OilKg = entity.OilKg,
        OilYieldPercent = entity.OilYieldPercent,
        QualityGrade = entity.QualityGrade,
        Notes = entity.Notes,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
