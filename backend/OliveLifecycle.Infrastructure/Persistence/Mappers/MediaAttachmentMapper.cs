using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class MediaAttachmentMapper
{
    public static MediaAttachment ToEntity(MediaAttachmentDocument document) => new()
    {
        Id = document.Id,
        OwnerType = MediaOwnerTypeExtensions.FromApiString(document.OwnerType) ?? MediaOwnerType.Note,
        OwnerId = document.OwnerId,
        FieldId = document.FieldId,
        MediaType = document.MediaType,
        Url = document.Url,
        ThumbnailUrl = document.ThumbnailUrl,
        FileName = document.FileName,
        ContentType = document.ContentType,
        UploadedByUserId = document.UploadedByUserId,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static MediaAttachmentDocument ToDocument(MediaAttachment entity) => new()
    {
        Id = entity.Id,
        OwnerType = entity.OwnerType.ToApiString(),
        OwnerId = entity.OwnerId,
        FieldId = entity.FieldId,
        MediaType = entity.MediaType,
        Url = entity.Url,
        ThumbnailUrl = entity.ThumbnailUrl,
        FileName = entity.FileName,
        ContentType = entity.ContentType,
        UploadedByUserId = entity.UploadedByUserId,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
