using System.Security.Cryptography;
using OliveLifecycle.Application.Abstractions.Imaging;
using OliveLifecycle.Application.Photos;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Abstractions.Storage;
using OliveLifecycle.Application.DTOs.Photos;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class PhotoHubService : IPhotoHubService
{
    public const int MaxImagesPerLinkedOwner = 5;
    public const long MaxUploadBytes = 10 * 1024 * 1024;
    public static readonly TimeSpan TrashRetention = TimeSpan.FromDays(30);

    private readonly IMediaAttachmentRepository _media;
    private readonly IFieldAccessScopeService _fieldAccessScope;
    private readonly IFieldAccessService _fieldAccess;
    private readonly IFieldRepository _fields;
    private readonly IFileStorageService _storage;
    private readonly IImageMetadataService _images;
    private readonly IFieldGeoMatchService _geoMatch;
    private readonly IPhotoContentUrlSigner _urlSigner;
    private readonly IUserRepository _users;
    private readonly INoteRepository _notes;
    private readonly IHarvestRecordRepository _harvests;
    private readonly IFieldTaskRepository _tasks;
    private readonly IFieldPhenologyObservationRepository _phenology;

    public PhotoHubService(
        IMediaAttachmentRepository media,
        IFieldAccessScopeService fieldAccessScope,
        IFieldAccessService fieldAccess,
        IFieldRepository fields,
        IFileStorageService storage,
        IImageMetadataService images,
        IFieldGeoMatchService geoMatch,
        IPhotoContentUrlSigner urlSigner,
        IUserRepository users,
        INoteRepository notes,
        IHarvestRecordRepository harvests,
        IFieldTaskRepository tasks,
        IFieldPhenologyObservationRepository phenology)
    {
        _media = media;
        _fieldAccessScope = fieldAccessScope;
        _fieldAccess = fieldAccess;
        _fields = fields;
        _storage = storage;
        _images = images;
        _geoMatch = geoMatch;
        _urlSigner = urlSigner;
        _users = users;
        _notes = notes;
        _harvests = harvests;
        _tasks = tasks;
        _phenology = phenology;
    }

    public async Task<IReadOnlyList<PhotoUploadResultDto>> UploadAsync(
        IReadOnlyList<PhotoUploadFile> files,
        string userId,
        string userRole,
        bool allowDuplicates = false,
        CancellationToken cancellationToken = default)
    {
        if (files.Count == 0)
        {
            throw new ValidationException("At least one image is required.");
        }

        var accessible = (await _fieldAccessScope.ResolveAccessibleFieldsAsync(
            userId, userRole, FamilyModules.Photos, cancellationToken)).ToList();
        var results = new List<PhotoUploadResultDto>();

        foreach (var file in files)
        {
            try
            {
                results.Add(await IngestOneAsync(
                    file, accessible, userId, userRole, allowDuplicates, cancellationToken));
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                results.Add(new PhotoUploadResultDto
                {
                    Failed = true,
                    Error = ex is ValidationException or InvalidOperationException
                        ? ex.Message
                        : "This file could not be read. Use JPEG, PNG, WebP, or GIF under 10 MB.",
                    Photo = new PhotoDto { FileName = Path.GetFileName(file.FileName) }
                });
            }
        }

        return results;
    }

    public async Task<PhotoListDto> QueryAsync(
        PhotoQueryDto query,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        await PurgeExpiredTrashAsync(cancellationToken);

        var accessible = (await _fieldAccessScope.ResolveAccessibleFieldsAsync(
            userId, userRole, FamilyModules.Photos, cancellationToken)).ToList();
        var accessibleIds = accessible.Select(f => f.Id).ToList();
        var fieldNames = accessible.ToDictionary(f => f.Id, f => f.Name, StringComparer.Ordinal);

        if (!string.IsNullOrWhiteSpace(query.FieldId))
        {
            await EnsurePhotoAccessAsync(query.FieldId, userId, userRole, cancellationToken);
            if (!fieldNames.ContainsKey(query.FieldId))
            {
                var field = await _fields.GetByIdAsync(query.FieldId.Trim(), cancellationToken);
                if (field != null)
                {
                    fieldNames[field.Id] = field.Name;
                }
            }
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
            Sort = query.Sort,
            TrashedOnly = query.TrashedOnly,
            Page = query.Page,
            PageSize = query.PageSize
        }, cancellationToken);

        var dtos = new List<PhotoDto>();
        foreach (var item in items)
        {
            dtos.Add(await ToDtoAsync(item, userId, userRole, fieldNames, cancellationToken));
        }

        return new PhotoListDto
        {
            Items = dtos,
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
        return await ToDtoAsync(photo, userId, userRole, null, cancellationToken);
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
        await EnsurePhotoAccessAsync(dto.FieldId, userId, userRole, cancellationToken);

        photo.FieldId = dto.FieldId.Trim();
        photo.FieldAssignment = FieldAssignmentStatus.Manual;
        photo.FieldMatchScore = 1.0;
        photo.AssignmentReason = "manual";
        if (photo.OwnerType == MediaOwnerType.Field)
        {
            photo.OwnerId = string.Empty;
        }

        photo.UpdatedAt = DateTime.UtcNow;
        await _media.UpdateAsync(photo, cancellationToken);
        return await ToDtoAsync(photo, userId, userRole, null, cancellationToken);
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

        if (dto.Caption != null)
        {
            var caption = dto.Caption.Trim();
            if (caption.Length > 500)
            {
                throw new ValidationException("Caption must be 500 characters or fewer.");
            }

            photo.Caption = caption.Length == 0 ? null : caption;
        }

        photo.UpdatedAt = DateTime.UtcNow;
        await _media.UpdateAsync(photo, cancellationToken);
        return await ToDtoAsync(photo, userId, userRole, null, cancellationToken);
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

        var snapshot = await ResolveLinkedSnapshotAsync(ownerType, dto.OwnerId.Trim(), cancellationToken);
        if (!string.Equals(snapshot.FieldId, photo.FieldId, StringComparison.Ordinal))
        {
            throw new ValidationException("Photo field must match the linked record field.");
        }

        await EnsurePhotoAccessAsync(photo.FieldId, userId, userRole, cancellationToken);

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
        photo.LinkedTitle = snapshot.Title;
        photo.LinkedOccurredAt = snapshot.OccurredAt;
        photo.LinkedStatus = snapshot.Status;
        photo.UpdatedAt = DateTime.UtcNow;
        await _media.UpdateAsync(photo, cancellationToken);

        if (previousType.IsLinkedRecord()
            && !string.IsNullOrWhiteSpace(previousOwnerId)
            && (previousType != ownerType || !string.Equals(previousOwnerId, photo.OwnerId, StringComparison.Ordinal)))
        {
            await SyncOwnerAttachmentIdsAsync(previousType, previousOwnerId, photo, link: false, cancellationToken);
        }

        await SyncOwnerAttachmentIdsAsync(photo.OwnerType, photo.OwnerId, photo, link: true, cancellationToken);
        return await ToDtoAsync(photo, userId, userRole, null, cancellationToken);
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
            return await ToDtoAsync(photo, userId, userRole, null, cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(photo.FieldId))
        {
            throw new ValidationException("Cannot unlink a photo without a field assignment.");
        }

        await EnsurePhotoAccessAsync(photo.FieldId, userId, userRole, cancellationToken);

        var previousType = photo.OwnerType;
        var previousOwnerId = photo.OwnerId;
        var preservedFieldId = photo.FieldId;
        photo.OwnerType = MediaOwnerType.Field;
        photo.OwnerId = string.Empty;
        photo.LinkedTitle = null;
        photo.LinkedOccurredAt = null;
        photo.LinkedStatus = null;
        photo.FieldId = preservedFieldId;
        photo.UpdatedAt = DateTime.UtcNow;
        await _media.UpdateAsync(photo, cancellationToken);

        await SyncOwnerAttachmentIdsAsync(previousType, previousOwnerId, photo, link: false, cancellationToken);
        return await ToDtoAsync(photo, userId, userRole, null, cancellationToken);
    }

    public async Task DeleteAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var photo = await GetAccessiblePhotoAsync(id, userId, userRole, cancellationToken);
        if (!await CanTrashAsync(photo, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have permission to move this photo to the trash.");
        }

        if (photo.OwnerType.IsLinkedRecord())
        {
            await SyncOwnerAttachmentIdsAsync(photo.OwnerType, photo.OwnerId, photo, link: false, cancellationToken);
        }

        photo.DeletedAt = DateTime.UtcNow;
        photo.DeletedByUserId = userId;
        photo.UpdatedAt = DateTime.UtcNow;
        await _media.UpdateAsync(photo, cancellationToken);
    }

    public async Task<PhotoDto> RestoreAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var photo = await _media.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Photo not found.");
        if (!photo.IsTrashed)
        {
            return await ToDtoAsync(photo, userId, userRole, null, cancellationToken);
        }

        if (!await CanTrashAsync(photo, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have permission to restore this photo.");
        }

        if (!string.IsNullOrWhiteSpace(photo.FieldId))
        {
            await EnsurePhotoAccessAsync(photo.FieldId, userId, userRole, cancellationToken);
        }
        else if (!string.Equals(photo.UploadedByUserId, userId, StringComparison.Ordinal))
        {
            throw new ForbiddenException("You do not have permission to restore this photo.");
        }

        photo.DeletedAt = null;
        photo.DeletedByUserId = null;
        photo.UpdatedAt = DateTime.UtcNow;
        await _media.UpdateAsync(photo, cancellationToken);

        if (photo.OwnerType.IsLinkedRecord() && !string.IsNullOrWhiteSpace(photo.OwnerId))
        {
            try
            {
                await SyncOwnerAttachmentIdsAsync(photo.OwnerType, photo.OwnerId, photo, link: true, cancellationToken);
            }
            catch (NotFoundException)
            {
                photo.OwnerType = MediaOwnerType.Field;
                photo.OwnerId = string.Empty;
                photo.LinkedTitle = null;
                photo.LinkedOccurredAt = null;
                photo.LinkedStatus = null;
                await _media.UpdateAsync(photo, cancellationToken);
            }
        }

        return await ToDtoAsync(photo, userId, userRole, null, cancellationToken);
    }

    public async Task PurgeAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var photo = await _media.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Photo not found.");
        if (!photo.IsTrashed)
        {
            throw new ValidationException("Move the photo to the trash before deleting it permanently.");
        }

        if (!await CanTrashAsync(photo, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have permission to delete this photo.");
        }

        if (!string.IsNullOrWhiteSpace(photo.Url))
        {
            await _storage.DeleteAsync(photo.Url, cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(photo.ThumbnailUrl)
            && !string.Equals(photo.ThumbnailUrl, photo.Url, StringComparison.Ordinal))
        {
            await _storage.DeleteAsync(photo.ThumbnailUrl, cancellationToken);
        }

        await _media.DeleteAsync(id, cancellationToken);
    }

    public async Task<PhotoContentResult> GetContentBySignatureAsync(
        string id,
        string variant,
        long expUnix,
        string signature,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeVariant(variant);
        if (!_urlSigner.TryValidate(id, normalized, expUnix, signature, userId))
        {
            throw new NotFoundException("Photo not found.");
        }

        var photo = await _media.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Photo not found.");

        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("Photo not found.");
        var userRole = user.Role.ToString();

        if (string.IsNullOrWhiteSpace(photo.FieldId))
        {
            if (!string.Equals(photo.UploadedByUserId, userId, StringComparison.Ordinal))
            {
                throw new NotFoundException("Photo not found.");
            }
        }
        else
        {
            if (!await _fieldAccess.CanUserAccessFieldPhotosAsync(photo.FieldId, userId, userRole, cancellationToken))
            {
                throw new NotFoundException("Photo not found.");
            }
        }

        var storageUrl = string.Equals(normalized, PhotoContentVariants.Thumb, StringComparison.Ordinal)
            ? (photo.ThumbnailUrl ?? photo.Url)
            : photo.Url;

        var stream = await _storage.OpenReadAsync(storageUrl, cancellationToken)
            ?? throw new NotFoundException("Photo not found.");

        var contentType = string.Equals(normalized, PhotoContentVariants.Thumb, StringComparison.Ordinal)
            ? "image/jpeg"
            : (photo.ContentType ?? "application/octet-stream");

        return new PhotoContentResult
        {
            Content = stream,
            ContentType = contentType,
            FileName = photo.FileName
        };
    }

    public string CreateSignedUrl(string photoId, string variant, string userId) =>
        _urlSigner.CreateUrl(photoId, NormalizeVariant(variant), userId);

    private async Task<PhotoUploadResultDto> IngestOneAsync(
        PhotoUploadFile file,
        IReadOnlyList<Field> accessibleFields,
        string userId,
        string userRole,
        bool allowDuplicates,
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

        var byteHash = Convert.ToHexString(SHA256.HashData(processed.OriginalBytes)).ToLowerInvariant();
        var identityHash = file.Transcoded && PhotoDuplicateRules.IsContentHash(file.SourceHash)
            ? file.SourceHash!.Trim().ToLowerInvariant()
            : byteHash;
        var now = DateTime.UtcNow;
        var exifCaptured = processed.CapturedAtUtc ?? file.CapturedAt;
        var capturedAt = exifCaptured ?? now;
        var latitude = processed.Latitude ?? file.Latitude;
        var longitude = processed.Longitude ?? file.Longitude;

        FieldGeoMatchResult match = new() { Assignment = FieldAssignmentStatus.Unassigned };
        string? assignmentReason = "noGps";
        if (latitude.HasValue && longitude.HasValue)
        {
            match = _geoMatch.Match(latitude.Value, longitude.Value, accessibleFields);
            assignmentReason = ResolveAssignmentReason(match);
        }

        var fieldId = match.FieldId ?? string.Empty;
        var hashMatches = new List<MediaAttachment>();
        hashMatches.AddRange(await _media.FindByContentHashAsync(identityHash, null, cancellationToken));
        if (!string.Equals(identityHash, byteHash, StringComparison.Ordinal))
        {
            hashMatches.AddRange(await _media.FindByContentHashAsync(byteHash, null, cancellationToken));
        }

        var accessibleIds = accessibleFields
            .Select(field => field.Id)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .ToHashSet(StringComparer.Ordinal);
        var duplicate = allowDuplicates
            ? null
            : PhotoDuplicateRules.SelectDuplicate(hashMatches, userId, accessibleIds, exifCaptured);
        var hashHit = hashMatches.Any(existing =>
            PhotoDuplicateRules.IsVisibleToUploader(existing, userId, accessibleIds));

        if (duplicate != null)
        {
            return new PhotoUploadResultDto
            {
                Photo = await ToDtoAsync(duplicate, userId, userRole,
                    accessibleFields.ToDictionary(f => f.Id, f => f.Name, StringComparer.Ordinal),
                    cancellationToken),
                DuplicateWarning = true,
                DuplicateSkipped = true,
                Candidates = match.Candidates.Select(MapCandidate).ToList()
            };
        }

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
            Latitude = latitude,
            Longitude = longitude,
            FieldAssignment = match.Assignment,
            FieldMatchScore = match.Score,
            AssignmentReason = assignmentReason,
            Kind = PhotoKind.General,
            ContentHash = identityHash,
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
            Photo = await ToDtoAsync(saved, userId, userRole,
                accessibleFields.ToDictionary(f => f.Id, f => f.Name, StringComparer.Ordinal),
                cancellationToken),
            DuplicateWarning = hashHit,
            Candidates = match.Candidates.Select(MapCandidate).ToList()
        };
    }

    private static string ResolveAssignmentReason(FieldGeoMatchResult match)
    {
        var top = match.Candidates.FirstOrDefault();
        if (top == null)
        {
            return "noGps";
        }

        return top.Reason switch
        {
            "boundary" => "gpsInside",
            "boundaryOverlap" => "gpsOverlap",
            "nearestCenter" => "gpsNear",
            _ => top.Reason
        };
    }

    private static PhotoFieldCandidateDto MapCandidate(FieldMatchCandidate c) => new()
    {
        FieldId = c.FieldId,
        FieldName = c.FieldName,
        Reason = c.Reason,
        Score = c.Score,
        DistanceMetres = c.DistanceMetres
    };

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

    private async Task<LinkedSnapshot> ResolveLinkedSnapshotAsync(
        MediaOwnerType ownerType,
        string ownerId,
        CancellationToken cancellationToken)
    {
        switch (ownerType)
        {
            case MediaOwnerType.Note:
            {
                var note = await _notes.GetByIdAsync(ownerId, cancellationToken)
                    ?? throw new NotFoundException("Note not found.");
                var title = string.IsNullOrWhiteSpace(note.Body)
                    ? "Observation"
                    : (note.Body.Length <= 80 ? note.Body.Trim() : note.Body.Trim()[..80] + "…");
                return new LinkedSnapshot(note.FieldId ?? string.Empty, title, note.OccurredAt, null);
            }
            case MediaOwnerType.Harvest:
            {
                var harvest = await _harvests.GetByIdAsync(ownerId, cancellationToken)
                    ?? throw new NotFoundException("Harvest not found.");
                return new LinkedSnapshot(
                    harvest.FieldId,
                    $"Harvest · {harvest.HarvestDate:yyyy-MM-dd}",
                    harvest.HarvestDate,
                    harvest.Status.ToString());
            }
            case MediaOwnerType.Task:
            {
                var task = await _tasks.GetByIdAsync(ownerId, cancellationToken)
                    ?? throw new NotFoundException("Task not found.");
                return new LinkedSnapshot(
                    task.FieldId,
                    string.IsNullOrWhiteSpace(task.Title) ? "Task" : task.Title,
                    task.CreatedAt,
                    task.Status.ToApiString());
            }
            case MediaOwnerType.Phenology:
            {
                var observation = await _phenology.GetByIdAsync(ownerId, cancellationToken)
                    ?? throw new NotFoundException("Phenology observation not found.");
                return new LinkedSnapshot(
                    observation.FieldId,
                    $"Phenology · {observation.StageCode}",
                    observation.ObservedOn,
                    observation.Confidence.ToString());
            }
            default:
                throw new ValidationException("Unsupported owner type.");
        }
    }

    private async Task RefreshLinkedSnapshotAsync(
        MediaAttachment photo,
        CancellationToken cancellationToken)
    {
        if (!photo.OwnerType.IsLinkedRecord() || string.IsNullOrWhiteSpace(photo.OwnerId))
        {
            return;
        }

        try
        {
            var snapshot = await ResolveLinkedSnapshotAsync(photo.OwnerType, photo.OwnerId, cancellationToken);
            photo.LinkedTitle = snapshot.Title;
            photo.LinkedOccurredAt = snapshot.OccurredAt;
            photo.LinkedStatus = snapshot.Status;
        }
        catch (NotFoundException)
        {
            // Keep existing snapshot; LinkBroken is derived in ToDto.
        }
    }

    private async Task<bool> IsLinkBrokenAsync(MediaAttachment photo, CancellationToken cancellationToken)
    {
        if (!photo.OwnerType.IsLinkedRecord() || string.IsNullOrWhiteSpace(photo.OwnerId))
        {
            return false;
        }

        try
        {
            await ResolveLinkedSnapshotAsync(photo.OwnerType, photo.OwnerId, cancellationToken);
            return false;
        }
        catch (NotFoundException)
        {
            return true;
        }
    }

    private async Task<MediaAttachment> GetAccessiblePhotoAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        var photo = await _media.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Photo not found.");

        if (photo.IsTrashed)
        {
            throw new NotFoundException("Photo not found.");
        }

        if (string.IsNullOrWhiteSpace(photo.FieldId))
        {
            if (!string.Equals(photo.UploadedByUserId, userId, StringComparison.Ordinal))
            {
                throw new ForbiddenException("You do not have access to this photo.");
            }

            return photo;
        }

        await EnsurePhotoAccessAsync(photo.FieldId, userId, userRole, cancellationToken);
        return photo;
    }

    private async Task EnsurePhotoAccessAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        if (!await _fieldAccess.CanUserAccessFieldPhotosAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to photos for this field.");
        }
    }

    private async Task<bool> CanTrashAsync(
        MediaAttachment photo,
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        if (string.Equals(photo.UploadedByUserId, userId, StringComparison.Ordinal))
        {
            return true;
        }

        if (string.Equals(userRole, Roles.Administrator, StringComparison.Ordinal))
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(photo.FieldId))
        {
            return false;
        }

        return await _fieldAccess.CanUserModifyFieldAsync(photo.FieldId, userId, cancellationToken);
    }

    private async Task<PhotoDto> ToDtoAsync(
        MediaAttachment entity,
        string userId,
        string userRole,
        IReadOnlyDictionary<string, string>? fieldNames,
        CancellationToken cancellationToken)
    {
        if (entity.OwnerType.IsLinkedRecord())
        {
            await RefreshLinkedSnapshotAsync(entity, cancellationToken);
        }

        string? fieldName = null;
        if (!string.IsNullOrWhiteSpace(entity.FieldId))
        {
            if (fieldNames != null && fieldNames.TryGetValue(entity.FieldId, out var cached))
            {
                fieldName = cached;
            }
            else
            {
                var field = await _fields.GetByIdAsync(entity.FieldId, cancellationToken);
                fieldName = field?.Name;
            }
        }

        var linkBroken = await IsLinkBrokenAsync(entity, cancellationToken);
        var canTrash = await CanTrashAsync(entity, userId, userRole, cancellationToken);

        return new PhotoDto
        {
            Id = entity.Id,
            OwnerType = entity.OwnerType.ToApiString(),
            OwnerId = entity.OwnerId,
            FieldId = entity.FieldId,
            FieldName = fieldName,
            MediaType = entity.MediaType,
            Url = _urlSigner.CreateUrl(entity.Id, PhotoContentVariants.Original, userId),
            ThumbnailUrl = _urlSigner.CreateUrl(entity.Id, PhotoContentVariants.Thumb, userId),
            FileName = entity.FileName,
            ContentType = entity.ContentType,
            UploadedByUserId = entity.UploadedByUserId,
            CapturedAt = entity.CapturedAt,
            EffectiveCapturedAt = entity.EffectiveCapturedAt,
            Latitude = entity.Latitude,
            Longitude = entity.Longitude,
            FieldAssignment = entity.FieldAssignment.ToApiString(),
            FieldMatchScore = entity.FieldMatchScore,
            AssignmentReason = entity.AssignmentReason,
            Caption = entity.Caption,
            Kind = entity.Kind.ToApiString(),
            ContentHash = entity.ContentHash,
            Width = entity.Width,
            Height = entity.Height,
            ByteSize = entity.ByteSize,
            IsLinked = entity.OwnerType.IsLinkedRecord(),
            LinkedTitle = entity.LinkedTitle,
            LinkedOccurredAt = entity.LinkedOccurredAt,
            LinkedStatus = entity.LinkedStatus,
            LinkBroken = linkBroken,
            CanTrash = canTrash,
            DeletedAt = entity.DeletedAt,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt
        };
    }

    private async Task PurgeExpiredTrashAsync(CancellationToken cancellationToken)
    {
        var cutoff = DateTime.UtcNow - TrashRetention;
        var purged = await _media.PurgeTrashedOlderThanAsync(cutoff, cancellationToken);
        // Files for purged rows are left for a follow-up storage sweep; metadata is gone.
        _ = purged;
    }

    private static string NormalizeVariant(string variant) =>
        string.Equals(variant, PhotoContentVariants.Thumb, StringComparison.OrdinalIgnoreCase)
            ? PhotoContentVariants.Thumb
            : PhotoContentVariants.Original;

    private sealed record LinkedSnapshot(
        string FieldId,
        string Title,
        DateTime? OccurredAt,
        string? Status);
}
