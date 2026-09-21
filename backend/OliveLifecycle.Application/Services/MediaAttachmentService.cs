using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Media;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class MediaAttachmentService : IMediaAttachmentService
{
    public const int MaxImagesPerOwner = 5;

    private readonly IMediaAttachmentRepository _media;
    private readonly IFieldAccessService _fieldAccess;

    public MediaAttachmentService(
        IMediaAttachmentRepository media,
        IFieldAccessService fieldAccess)
    {
        _media = media;
        _fieldAccess = fieldAccess;
    }

    public async Task<IReadOnlyList<MediaAttachmentDto>> AttachUrlsAsync(
        string ownerType,
        string ownerId,
        string fieldId,
        IReadOnlyList<string> urls,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var type = MediaOwnerTypeExtensions.FromApiString(ownerType)
            ?? throw new ValidationException("Invalid media owner type.");
        if (string.IsNullOrWhiteSpace(ownerId))
        {
            throw new ValidationException("Owner id is required.");
        }

        if (string.IsNullOrWhiteSpace(fieldId))
        {
            throw new ValidationException("Field id is required.");
        }

        if (!await _fieldAccess.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var cleanUrls = urls
            .Where(u => !string.IsNullOrWhiteSpace(u))
            .Select(u => u.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (cleanUrls.Count == 0)
        {
            return Array.Empty<MediaAttachmentDto>();
        }

        var existing = await _media.CountByOwnerAsync(type, ownerId, cancellationToken);
        if (existing + cleanUrls.Count > MaxImagesPerOwner)
        {
            throw new ValidationException($"At most {MaxImagesPerOwner} attachments are allowed.");
        }

        var created = new List<MediaAttachmentDto>();
        var now = DateTime.UtcNow;
        foreach (var url in cleanUrls)
        {
            var mediaType = InferMediaType(url);
            var entity = new MediaAttachment
            {
                OwnerType = type,
                OwnerId = ownerId,
                FieldId = fieldId.Trim(),
                MediaType = mediaType,
                Url = url,
                ThumbnailUrl = mediaType == "image" ? url : null,
                FileName = InferFileName(url),
                ContentType = InferContentType(url, mediaType),
                UploadedByUserId = userId,
                CapturedAt = now,
                FieldAssignment = FieldAssignmentStatus.Manual,
                Kind = PhotoKind.General,
                CreatedAt = now,
                UpdatedAt = now
            };
            var saved = await _media.CreateAsync(entity, cancellationToken);
            created.Add(ToDto(saved));
        }

        return created;
    }

    internal static string InferMediaType(string url)
    {
        var ext = Path.GetExtension(url.Split('?', 2)[0]).ToLowerInvariant();
        return ext switch
        {
            ".m4a" or ".mp3" or ".webm" or ".wav" or ".aac" or ".ogg" => "audio",
            ".pdf" or ".doc" or ".docx" or ".txt" => "document",
            _ => "image"
        };
    }

    private static string? InferFileName(string url)
    {
        var path = url.Split('?', 2)[0];
        var name = Path.GetFileName(path);
        return string.IsNullOrWhiteSpace(name) ? null : name;
    }

    private static string? InferContentType(string url, string mediaType)
    {
        var ext = Path.GetExtension(url.Split('?', 2)[0]).ToLowerInvariant();
        return ext switch
        {
            ".m4a" => "audio/mp4",
            ".mp3" => "audio/mpeg",
            ".webm" => "audio/webm",
            ".wav" => "audio/wav",
            ".aac" => "audio/aac",
            ".ogg" => "audio/ogg",
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".txt" => "text/plain",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            _ => mediaType == "audio" ? "audio/mpeg" : mediaType == "document" ? "application/octet-stream" : "image/jpeg"
        };
    }

    public async Task<IReadOnlyList<MediaAttachmentDto>> GetByOwnerAsync(
        string ownerType,
        string ownerId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var type = MediaOwnerTypeExtensions.FromApiString(ownerType)
            ?? throw new ValidationException("Invalid media owner type.");
        var items = await _media.GetByOwnerAsync(type, ownerId, cancellationToken);
        var allowed = new List<MediaAttachmentDto>();
        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.FieldId))
            {
                if (string.Equals(item.UploadedByUserId, userId, StringComparison.Ordinal))
                {
                    allowed.Add(ToDto(item));
                }

                continue;
            }

            if (await _fieldAccess.CanUserAccessFieldAsync(item.FieldId, userId, userRole, cancellationToken))
            {
                allowed.Add(ToDto(item));
            }
        }

        return allowed;
    }

    public static MediaAttachmentDto ToDto(MediaAttachment entity) => new()
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
        CreatedAt = entity.CreatedAt
    };
}
