using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Image attachment for Photo Hub and Chronologio. Standalone hub photos use
/// <see cref="MediaOwnerType.Field"/>; linked photos point at a note/task/harvest/phenology.
/// </summary>
public class MediaAttachment : BaseEntity
{
    public MediaOwnerType OwnerType { get; set; } = MediaOwnerType.Field;
    public string OwnerId { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string MediaType { get; set; } = "image";
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? FileName { get; set; }
    public string? ContentType { get; set; }
    public string UploadedByUserId { get; set; } = string.Empty;

    /// <summary>EXIF DateTimeOriginal in UTC when available; otherwise upload time.</summary>
    public DateTime? CapturedAt { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public FieldAssignmentStatus FieldAssignment { get; set; } = FieldAssignmentStatus.Unassigned;
    public double? FieldMatchScore { get; set; }
    public PhotoKind Kind { get; set; } = PhotoKind.General;
    public string? ContentHash { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public int? Orientation { get; set; }
    public long? ByteSize { get; set; }

    /// <summary>Why the field was assigned (e.g. gpsInside, gpsNear, noGps, manual).</summary>
    public string? AssignmentReason { get; set; }

    /// <summary>Denormalized linked-record label for hub cards when the owner still exists or after soft orphaning.</summary>
    public string? LinkedTitle { get; set; }
    public DateTime? LinkedOccurredAt { get; set; }
    public string? LinkedStatus { get; set; }

    public DateTime? DeletedAt { get; set; }
    public string? DeletedByUserId { get; set; }

    public DateTime EffectiveCapturedAt => CapturedAt ?? CreatedAt;
    public bool IsTrashed => DeletedAt.HasValue;
}
