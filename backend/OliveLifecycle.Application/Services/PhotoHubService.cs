using System.Security.Cryptography;
using OliveLifecycle.Application.Abstractions.Imaging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Abstractions.Storage;
using OliveLifecycle.Application.DTOs.Photos;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class PhotoHubService : IPhotoHubService
{
    public const int MaxImagesPerLinkedOwner = 5;
    public const long MaxUploadBytes = 10 * 1024 * 1024;

    private static readonly HashSet<string> OwnerRoles = new(StringComparer.Ordinal)
    {
        Roles.FieldOwner,
        Roles.Administrator
    };

    private readonly IMediaAttachmentRepository _media;
    private readonly IFieldRepository _fields;
    private readonly IFieldAccessService _fieldAccess;
    private readonly IFileStorageService _storage;
    private readonly IImageMetadataService _images;
    private readonly IFieldGeoMatchService _geoMatch;
    private readonly INoteRepository _notes;
    private readonly IHarvestRecordRepository _harvests;
    private readonly IFieldTaskRepository _tasks;
    private readonly IFieldPhenologyObservationRepository _phenology;

    public PhotoHubService(
        IMediaAttachmentRepository media,
        IFieldRepository fields,
        IFieldAccessService fieldAccess,
        IFileStorageService storage,
        IImageMetadataService images,
        IFieldGeoMatchService geoMatch,
        INoteRepository notes,
        IHarvestRecordRepository harvests,
        IFieldTaskRepository tasks,
        IFieldPhenologyObservationRepository phenology)
    {
        _media = media;
        _fields = fields;
        _fieldAccess = fieldAccess;
        _storage = storage;
        _images = images;
        _geoMatch = geoMatch;
        _notes = notes;
        _harvests = harvests;
        _tasks = tasks;
        _phenology = phenology;
    }

    public async Task<IReadOnlyList<PhotoUploadResultDto>> UploadAsync(
        IReadOnlyList<PhotoUploadFile> files,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (files.Count == 0)
        {
            throw new ValidationException("At least one image is required.");
        }

        var accessible = (await GetAccessibleFieldsAsync(userId, userRole, cancellationToken)).ToList();
        var results = new List<PhotoUploadResultDto>();

        foreach (var file in files)
        {
            results.Add(await IngestOneAsync(file, accessible, userId, cancellationToken));
        }

        return results;
    }

    public async Task<PhotoListDto> QueryAsync(
        PhotoQueryDto query,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var accessibleIds = (await GetAccessibleFieldsAsync(userId, userRole, cancellationToken))
            .Select(f => f.Id)
            .ToList();

        if (!string.IsNullOrWhiteSpace(query.FieldId))
        {
            await EnsureFieldAccessAsync(query.FieldId, userId, userRole, cancellationToken);
        }

        bool? linkedOnly = query.LinkStatus?.Trim().ToLowerInvariant() switch
        {
            "linked" => true,
            "standalone" => false,
            _ => null
        };

        var (items, total) = await _media.QueryAsync(new MediaAttachmentQuery
        {
            AccessibleFieldIds = string.IsNullOrWhiteSpace(query.FieldId) ? accessibleIds : null,
            FieldId = string.IsNullOrWhiteSpace(query.FieldId) ? null : query.FieldId.Trim(),
            UploadedByUserIdForUnassigned = userId,
            From = query.From,
            To = query.To,
            FieldAssignment = FieldAssignmentStatusExtensions.FromApiString(query.FieldAssignment),
            OwnerType = MediaOwnerTypeExtensions.FromApiString(query.OwnerType),
            LinkedOnly = linkedOnly,
            Page = query.Page,
            PageSize = query.PageSize
        }, cancellationToken);

        return new PhotoListDto
        {
            Items = items.Select(ToDto).ToList(),
            TotalCount = total,
            Page = Math.Max(1, query.Page),
            PageSize = Math.Clamp(query.PageSize, 1, 100)
        };
    }

    public async Task<PhotoDto> GetByIdAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var photo = await GetAccessiblePhotoAsync(id, userId, userRole, cancellationToken);
        return ToDto(photo);
    }

    public async Task<PhotoDto> ConfirmFieldAsync(
        string id,
        ConfirmPhotoFieldDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.FieldId))
        {
            throw new ValidationException("Field id is required.");
        }

        var photo = await GetAccessiblePhotoAsync(id, userId, userRole, cancellationToken);
        await EnsureFieldAccessAsync(dto.FieldId, userId, userRole, cancellationToken);

        photo.FieldId = dto.FieldId.Trim();
        photo.FieldAssignment = FieldAssignmentStatus.Manual;
        photo.FieldMatchScore = 1.0;
        if (photo.OwnerType == MediaOwnerType.Field)
        {
            photo.OwnerId = string.Empty;
        }

        photo.UpdatedAt = DateTime.UtcNow;
        await _media.UpdateAsync(photo, cancellationToken);
        return ToDto(photo);
    }

    public async Task<PhotoDto> UpdateAsync(
        string id,
        UpdatePhotoDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var photo = await GetAccessiblePhotoAsync(id, userId, userRole, cancellationToken);
        if (!string.IsNullOrWhiteSpace(dto.Kind))
        {
            photo.Kind = PhotoKindExtensions.FromApiString(dto.Kind);
        }

        if (dto.CapturedAt.HasValue)
        {
            photo.CapturedAt = DateTime.SpecifyKind(dto.CapturedAt.Value.ToUniversalTime(), DateTimeKind.Utc);
        }

        photo.UpdatedAt = DateTime.UtcNow;
        await _media.UpdateAsync(photo, cancellationToken);
        return ToDto(photo);
    }

    public async Task<PhotoDto> LinkAsync(
        string id,
        LinkPhotoDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var ownerType = MediaOwnerTypeExtensions.FromApiString(dto.OwnerType)
            ?? throw new ValidationException("Invalid media owner type.");
        if (!ownerType.IsLinkedRecord())
        {
            throw new ValidationException("Photos can only be linked to note, task, harvest, or phenology.");
        }

        if (string.IsNullOrWhiteSpace(dto.OwnerId))
        {
            throw new ValidationException("Owner id is required.");
        }

        var photo = await GetAccessiblePhotoAsync(id, userId, userRole, cancellationToken);
        if (string.IsNullOrWhiteSpace(photo.FieldId))
        {
            throw new ValidationException("Assign a field before linking this photo.");
        }

        var targetFieldId = await ResolveOwnerFieldIdAsync(ownerType, dto.OwnerId.Trim(), cancellationToken);
        if (!string.Equals(targetFieldId, photo.FieldId, StringComparison.Ordinal))
        {
            throw new ValidationException("Photo field must match the linked record field.");
        }

        await EnsureFieldAccessAsync(photo.FieldId, userId, userRole, cancellationToken);

        if (ownerType is MediaOwnerType.Note or MediaOwnerType.Task or MediaOwnerType.Harvest)
        {
            var existing = await _media.CountByOwnerAsync(ownerType, dto.OwnerId.Trim(), cancellationToken);
            var already = string.Equals(photo.OwnerId, dto.OwnerId.Trim(), StringComparison.Ordinal)
                && photo.OwnerType == ownerType;
            if (!already && existing >= MaxImagesPerLinkedOwner)
            {
                throw new ValidationException($"At most {MaxImagesPerLinkedOwner} photos are allowed on this record.");
            }
        }

        var previousType = photo.OwnerType;
        var previousOwnerId = photo.OwnerId;

        photo.OwnerType = ownerType;
        photo.OwnerId = dto.OwnerId.Trim();
        photo.UpdatedAt = DateTime.UtcNow;
        await _media.UpdateAsync(photo, cancellationToken);

        if (previousType.IsLinkedRecord()
            && !string.IsNullOrWhiteSpace(previousOwnerId)
            && (previousType != ownerType || !string.Equals(previousOwnerId, photo.OwnerId, StringComparison.Ordinal)))
        {
            await SyncOwnerAttachmentIdsAsync(previousType, previousOwnerId, photo, link: false, cancellationToken);
        }

        await SyncOwnerAttachmentIdsAsync(photo.OwnerType, photo.OwnerId, photo, link: true, cancellationToken);
        return ToDto(photo);
    }

    public async Task<PhotoDto> UnlinkAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var photo = await GetAccessiblePhotoAsync(id, userId, userRole, cancellationToken);
        if (!photo.OwnerType.IsLinkedRecord())
        {
            return ToDto(photo);
        }

        if (string.IsNullOrWhiteSpace(photo.FieldId))
        {
            throw new ValidationException("Cannot unlink a photo without a field assignment.");
        }

        await EnsureFieldAccessAsync(photo.FieldId, userId, userRole, cancellationToken);

        var previousType = photo.OwnerType;
        var previousOwnerId = photo.OwnerId;
        photo.OwnerType = MediaOwnerType.Field;
        photo.OwnerId = string.Empty;
        photo.UpdatedAt = DateTime.UtcNow;
        await _media.UpdateAsync(photo, cancellationToken);

        await SyncOwnerAttachmentIdsAsync(previousType, previousOwnerId, photo, link: false, cancellationToken);
        return ToDto(photo);
    }

    public async Task DeleteAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var photo = await GetAccessiblePhotoAsync(id, userId, userRole, cancellationToken);
        if (photo.OwnerType.IsLinkedRecord())
        {
            await SyncOwnerAttachmentIdsAsync(photo.OwnerType, photo.OwnerId, photo, link: false, cancellationToken);
        }

        await _storage.DeleteAsync(photo.Url, cancellationToken);
        if (!string.IsNullOrWhiteSpace(photo.ThumbnailUrl) &&
            !string.Equals(photo.ThumbnailUrl, photo.Url, StringComparison.OrdinalIgnoreCase))
        {
            await _storage.DeleteAsync(photo.ThumbnailUrl, cancellationToken);
        }

        await _media.DeleteAsync(photo.Id, cancellationToken);
    }

    private async Task<PhotoUploadResultDto> IngestOneAsync(
        PhotoUploadFile file,
        IReadOnlyList<Field> accessibleFields,
        string userId,
        CancellationToken cancellationToken)
    {
        if (file.Content.CanSeek)
        {
            file.Content.Position = 0;
        }

        var processed = await _images.ProcessAsync(file.Content, cancellationToken);
        if (processed.OriginalBytes.Length > MaxUploadBytes)
        {
            throw new ValidationException("Image exceeds the 10 MB limit.");
        }

        var hash = Convert.ToHexString(SHA256.HashData(processed.OriginalBytes)).ToLowerInvariant();
        var now = DateTime.UtcNow;
        var capturedAt = processed.CapturedAtUtc ?? now;

        FieldGeoMatchResult match = new() { Assignment = FieldAssignmentStatus.Unassigned };
        if (processed.Latitude.HasValue && processed.Longitude.HasValue)
        {
            match = _geoMatch.Match(processed.Latitude.Value, processed.Longitude.Value, accessibleFields);
        }

        var fieldId = match.FieldId ?? string.Empty;
        var duplicates = await _media.FindByContentHashAsync(
            hash,
            string.IsNullOrWhiteSpace(fieldId) ? null : fieldId,
            cancellationToken);

        await using var originalStream = new MemoryStream(processed.OriginalBytes);
        await using var thumbStream = new MemoryStream(processed.ThumbnailBytes);
        var stored = await _storage.SavePhotoAsync(
            originalStream,
            thumbStream,
            file.FileName,
            file.ContentType ?? "image/jpeg",
            cancellationToken);

        var entity = new MediaAttachment
        {
            OwnerType = MediaOwnerType.Field,
            OwnerId = string.Empty,
            FieldId = fieldId,
            MediaType = "image",
            Url = stored.Url,
            ThumbnailUrl = stored.ThumbnailUrl,
            FileName = Path.GetFileName(file.FileName),
            ContentType = file.ContentType,
            UploadedByUserId = userId,
            CapturedAt = capturedAt,
            Latitude = processed.Latitude,
            Longitude = processed.Longitude,
            FieldAssignment = match.Assignment,
            FieldMatchScore = match.Score,
            Kind = PhotoKind.General,
            ContentHash = hash,
            Width = processed.Width,
            Height = processed.Height,
            Orientation = processed.Orientation,
            ByteSize = stored.ByteSize,
            CreatedAt = now,
            UpdatedAt = now
        };

        var saved = await _media.CreateAsync(entity, cancellationToken);
        return new PhotoUploadResultDto
        {
            Photo = ToDto(saved),
            DuplicateWarning = duplicates.Count > 0,
            Candidates = match.Candidates.Select(c => new PhotoFieldCandidateDto
            {
                FieldId = c.FieldId,
                FieldName = c.FieldName,
                Reason = c.Reason,
                Score = c.Score,
                DistanceMetres = c.DistanceMetres
            }).ToList()
        };
    }

    private async Task SyncOwnerAttachmentIdsAsync(
        MediaOwnerType ownerType,
        string ownerId,
        MediaAttachment photo,
        bool link,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(ownerId))
        {
            return;
        }

        if (ownerType == MediaOwnerType.Phenology)
        {
            var observation = await _phenology.GetByIdAsync(ownerId, cancellationToken)
                ?? throw new NotFoundException("Phenology observation not found.");
            if (link)
            {
                if (!observation.PhotoIds.Contains(photo.Id, StringComparer.Ordinal))
                {
                    observation.PhotoIds.Add(photo.Id);
                }
            }
            else
            {
                observation.PhotoIds.RemoveAll(id => string.Equals(id, photo.Id, StringComparison.Ordinal));
            }

            observation.UpdatedAt = DateTime.UtcNow;
            await _phenology.UpdateAsync(observation, cancellationToken);
            return;
        }

        if (ownerType == MediaOwnerType.Task)
        {
            var task = await _tasks.GetByIdAsync(ownerId, cancellationToken)
                ?? throw new NotFoundException("Task not found.");
            if (link)
            {
                if (!task.AttachmentIds.Contains(photo.Id, StringComparer.Ordinal))
                {
                    task.AttachmentIds.Add(photo.Id);
                }
            }
            else
            {
                task.AttachmentIds.RemoveAll(id => string.Equals(id, photo.Id, StringComparison.Ordinal));
            }

            task.UpdatedAt = DateTime.UtcNow;
            await _tasks.UpdateAsync(task, cancellationToken);
        }
    }

    private async Task<string> ResolveOwnerFieldIdAsync(
        MediaOwnerType ownerType,
        string ownerId,
        CancellationToken cancellationToken)
    {
        return ownerType switch
        {
            MediaOwnerType.Note => (await _notes.GetByIdAsync(ownerId, cancellationToken)
                ?? throw new NotFoundException("Note not found.")).FieldId
                ?? throw new ValidationException("Note has no field."),
            MediaOwnerType.Harvest => (await _harvests.GetByIdAsync(ownerId, cancellationToken)
                ?? throw new NotFoundException("Harvest not found.")).FieldId,
            MediaOwnerType.Task => (await _tasks.GetByIdAsync(ownerId, cancellationToken)
                ?? throw new NotFoundException("Task not found.")).FieldId,
            MediaOwnerType.Phenology => (await _phenology.GetByIdAsync(ownerId, cancellationToken)
                ?? throw new NotFoundException("Phenology observation not found.")).FieldId,
            _ => throw new ValidationException("Unsupported owner type.")
        };
    }

    private async Task<MediaAttachment> GetAccessiblePhotoAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        var photo = await _media.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Photo not found.");

        if (string.IsNullOrWhiteSpace(photo.FieldId))
        {
            if (!string.Equals(photo.UploadedByUserId, userId, StringComparison.Ordinal))
            {
                throw new ForbiddenException("You do not have access to this photo.");
            }

            return photo;
        }

        await EnsureFieldAccessAsync(photo.FieldId, userId, userRole, cancellationToken);
        return photo;
    }

    private async Task EnsureFieldAccessAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        if (!await _fieldAccess.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }
    }

    private async Task<IEnumerable<Field>> GetAccessibleFieldsAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        if (OwnerRoles.Contains(userRole))
        {
            return await _fields.GetByOwnerIdAsync(userId, cancellationToken);
        }

        if (userRole == Roles.Producer)
        {
            return await _fields.GetByAssignedProducerIdAsync(userId, cancellationToken);
        }

        return await _fields.GetByMemberUserIdAsync(userId, cancellationToken);
    }

    public static PhotoDto ToDto(MediaAttachment entity) => new()
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
        CapturedAt = entity.CapturedAt,
        EffectiveCapturedAt = entity.EffectiveCapturedAt,
        Latitude = entity.Latitude,
        Longitude = entity.Longitude,
        FieldAssignment = entity.FieldAssignment.ToApiString(),
        FieldMatchScore = entity.FieldMatchScore,
        Kind = entity.Kind.ToApiString(),
        ContentHash = entity.ContentHash,
        Width = entity.Width,
        Height = entity.Height,
        ByteSize = entity.ByteSize,
        IsLinked = entity.OwnerType.IsLinkedRecord(),
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
