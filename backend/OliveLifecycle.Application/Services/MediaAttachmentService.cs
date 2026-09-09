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
            throw new ValidationException($"At most {MaxImagesPerOwner} photos are allowed.");
        }

        var created = new List<MediaAttachmentDto>();
        var now = DateTime.UtcNow;
        foreach (var url in cleanUrls)
        {
            var entity = new MediaAttachment
            {
                OwnerType = type,
                OwnerId = ownerId,
                FieldId = fieldId.Trim(),
                MediaType = "image",
                Url = url,
                ThumbnailUrl = url,
                UploadedByUserId = userId,
                CreatedAt = now,
                UpdatedAt = now
            };
            var saved = await _media.CreateAsync(entity, cancellationToken);
            created.Add(ToDto(saved));
        }

        return created;
    }

    public async Task<IReadOnlyList<MediaAttachmentDto>> GetByOwnerAsync(
        string ownerType,
        string ownerId,
        CancellationToken cancellationToken = default)
    {
        var type = MediaOwnerTypeExtensions.FromApiString(ownerType)
            ?? throw new ValidationException("Invalid media owner type.");
        var items = await _media.GetByOwnerAsync(type, ownerId, cancellationToken);
        return items.Select(ToDto).ToList();
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
