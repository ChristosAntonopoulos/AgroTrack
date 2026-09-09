using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class ServiceCategoryMapper
{
    public static ServiceCategory ToEntity(ServiceCategoryDocument document) => new()
    {
        Id = document.Id,
        Slug = document.Slug,
        NameEl = document.NameEl,
        NameEn = document.NameEn,
        NameIt = document.NameIt,
        DescriptionEl = document.DescriptionEl,
        DescriptionEn = document.DescriptionEn,
        DescriptionIt = document.DescriptionIt,
        Icon = document.Icon,
        ParentCategoryId = document.ParentCategoryId,
        SortOrder = document.SortOrder,
        IsActive = document.IsActive,
        IsProminent = document.IsProminent,
        SuggestedTaskTypes = document.SuggestedTaskTypes ?? new List<string>(),
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static ServiceCategoryDocument ToDocument(ServiceCategory entity) => new()
    {
        Id = entity.Id,
        Slug = entity.Slug,
        NameEl = entity.NameEl,
        NameEn = entity.NameEn,
        NameIt = entity.NameIt,
        DescriptionEl = entity.DescriptionEl,
        DescriptionEn = entity.DescriptionEn,
        DescriptionIt = entity.DescriptionIt,
        Icon = entity.Icon,
        ParentCategoryId = entity.ParentCategoryId,
        SortOrder = entity.SortOrder,
        IsActive = entity.IsActive,
        IsProminent = entity.IsProminent,
        SuggestedTaskTypes = entity.SuggestedTaskTypes,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}

public static class ServiceProviderProfileMapper
{
    public static ServiceProviderProfile ToEntity(ServiceProviderProfileDocument document) => new()
    {
        Id = document.Id,
        UserId = document.UserId,
        DisplayName = document.DisplayName,
        PhotoUrl = document.PhotoUrl,
        BusinessName = document.BusinessName,
        ProviderKind = ParseEnum(document.ProviderKind, ProviderKind.Individual),
        ServiceCategoryIds = document.ServiceCategoryIds ?? new List<string>(),
        BaseLocation = document.BaseLocation == null
            ? null
            : new GeoJsonPoint
            {
                Type = document.BaseLocation.Type,
                Coordinates = document.BaseLocation.Coordinates ?? new List<double>()
            },
        BaseAreaLabel = document.BaseAreaLabel,
        ServiceRadiusKm = document.ServiceRadiusKm,
        ServiceAreas = document.ServiceAreas ?? new List<string>(),
        ShortDescription = document.ShortDescription,
        ExperienceYears = document.ExperienceYears,
        CrewSize = document.CrewSize,
        Equipment = document.Equipment,
        MillOperatingPeriod = document.MillOperatingPeriod,
        MillProcessingMethod = document.MillProcessingMethod,
        MillOrganic = document.MillOrganic,
        MillAppointmentRequired = document.MillAppointmentRequired,
        Languages = document.Languages ?? new List<string>(),
        Certifications = document.Certifications ?? new List<string>(),
        ContactPreference = ParseEnum(document.ContactPreference, ContactPreference.InApp),
        ShowPhone = document.ShowPhone,
        PhoneNumber = document.PhoneNumber,
        Availability = ParseEnum(document.Availability, ProviderAvailability.Available),
        AvailableFrom = document.AvailableFrom,
        AvailableUntil = document.AvailableUntil,
        IsPaused = document.IsPaused,
        VerificationStatus = ParseEnum(document.VerificationStatus, VerificationStatus.Unverified),
        PricingNote = document.PricingNote,
        IsListed = document.IsListed,
        CompletenessScore = document.CompletenessScore,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static ServiceProviderProfileDocument ToDocument(ServiceProviderProfile entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        DisplayName = entity.DisplayName,
        PhotoUrl = entity.PhotoUrl,
        BusinessName = entity.BusinessName,
        ProviderKind = entity.ProviderKind.ToString(),
        ServiceCategoryIds = entity.ServiceCategoryIds,
        BaseLocation = entity.BaseLocation == null
            ? null
            : new GeoJsonPointDocument
            {
                Type = string.IsNullOrWhiteSpace(entity.BaseLocation.Type) ? "Point" : entity.BaseLocation.Type,
                Coordinates = entity.BaseLocation.Coordinates
            },
        BaseAreaLabel = entity.BaseAreaLabel,
        ServiceRadiusKm = entity.ServiceRadiusKm,
        ServiceAreas = entity.ServiceAreas,
        ShortDescription = entity.ShortDescription,
        ExperienceYears = entity.ExperienceYears,
        CrewSize = entity.CrewSize,
        Equipment = entity.Equipment,
        MillOperatingPeriod = entity.MillOperatingPeriod,
        MillProcessingMethod = entity.MillProcessingMethod,
        MillOrganic = entity.MillOrganic,
        MillAppointmentRequired = entity.MillAppointmentRequired,
        Languages = entity.Languages,
        Certifications = entity.Certifications,
        ContactPreference = entity.ContactPreference.ToString(),
        ShowPhone = entity.ShowPhone,
        PhoneNumber = entity.PhoneNumber,
        Availability = entity.Availability.ToString(),
        AvailableFrom = entity.AvailableFrom,
        AvailableUntil = entity.AvailableUntil,
        IsPaused = entity.IsPaused,
        VerificationStatus = entity.VerificationStatus.ToString(),
        PricingNote = entity.PricingNote,
        IsListed = entity.IsListed,
        CompletenessScore = entity.CompletenessScore,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    private static T ParseEnum<T>(string? value, T fallback) where T : struct, Enum =>
        Enum.TryParse(value, true, out T parsed) ? parsed : fallback;
}

public static class ServiceContactRequestMapper
{
    public static ServiceContactRequest ToEntity(ServiceContactRequestDocument document) => new()
    {
        Id = document.Id,
        RequesterUserId = document.RequesterUserId,
        ProviderUserId = document.ProviderUserId,
        ServiceCategoryId = document.ServiceCategoryId,
        FieldId = document.FieldId,
        TaskId = document.TaskId,
        ApproximateArea = document.ApproximateArea,
        AreaHectares = document.AreaHectares,
        SuggestedStart = document.SuggestedStart,
        SuggestedEnd = document.SuggestedEnd,
        Message = document.Message,
        Status = Enum.TryParse<ServiceContactStatus>(document.Status, true, out var status)
            ? status
            : ServiceContactStatus.New,
        ContactMethod = document.ContactMethod,
        ViewedAt = document.ViewedAt,
        RespondedAt = document.RespondedAt,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static ServiceContactRequestDocument ToDocument(ServiceContactRequest entity) => new()
    {
        Id = entity.Id,
        RequesterUserId = entity.RequesterUserId,
        ProviderUserId = entity.ProviderUserId,
        ServiceCategoryId = entity.ServiceCategoryId,
        FieldId = entity.FieldId,
        TaskId = entity.TaskId,
        ApproximateArea = entity.ApproximateArea,
        AreaHectares = entity.AreaHectares,
        SuggestedStart = entity.SuggestedStart,
        SuggestedEnd = entity.SuggestedEnd,
        Message = entity.Message,
        Status = entity.Status.ToString(),
        ContactMethod = entity.ContactMethod,
        ViewedAt = entity.ViewedAt,
        RespondedAt = entity.RespondedAt,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}

public static class UserNotificationMapper
{
    public static UserNotification ToEntity(UserNotificationDocument document) => new()
    {
        Id = document.Id,
        UserId = document.UserId,
        Type = document.Type,
        Title = document.Title,
        Message = document.Message,
        RelatedEntityId = document.RelatedEntityId,
        RelatedEntityType = document.RelatedEntityType,
        ActionUrl = document.ActionUrl,
        IsRead = document.IsRead,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static UserNotificationDocument ToDocument(UserNotification entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        Type = entity.Type,
        Title = entity.Title,
        Message = entity.Message,
        RelatedEntityId = entity.RelatedEntityId,
        RelatedEntityType = entity.RelatedEntityType,
        ActionUrl = entity.ActionUrl,
        IsRead = entity.IsRead,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
