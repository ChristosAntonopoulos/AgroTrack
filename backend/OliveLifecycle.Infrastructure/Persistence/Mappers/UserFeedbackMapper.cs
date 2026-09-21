using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class UserFeedbackMapper
{
    public static UserFeedback ToEntity(UserFeedbackDocument document) => new()
    {
        Id = document.Id,
        UserId = document.UserId,
        UserEmail = document.UserEmail,
        UserName = document.UserName,
        Role = document.Role,
        Comment = document.Comment,
        PageUrl = document.PageUrl,
        UserAgent = document.UserAgent,
        ScreenshotUrl = document.ScreenshotUrl,
        PhotoUrl = document.PhotoUrl,
        SeenAt = document.SeenAt,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static UserFeedbackDocument ToDocument(UserFeedback entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        UserEmail = entity.UserEmail,
        UserName = entity.UserName,
        Role = entity.Role,
        Comment = entity.Comment,
        PageUrl = entity.PageUrl,
        UserAgent = entity.UserAgent,
        ScreenshotUrl = entity.ScreenshotUrl,
        PhotoUrl = entity.PhotoUrl,
        SeenAt = entity.SeenAt,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
