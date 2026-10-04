using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class MediaAttachmentMapper
{
    public static MediaAttachment ToEntity(MediaAttachmentDocument document)
    {
        var ownerType = MediaOwnerTypeExtensions.FromApiString(document.OwnerType) ?? MediaOwnerType.Note;
        var assignment = FieldAssignmentStatusExtensions.FromApiString(document.FieldAssignment)
            ?? FieldAssignmentStatus.Unassigned;

        // Legacy attach-by-URL rows predate hub metadata; treat linked records with a field as manual.
        if (assignment == FieldAssignmentStatus.Unassigned
            && !string.IsNullOrWhiteSpace(document.FieldId)
            && ownerType.IsLinkedRecord()
            && document.CapturedAt == null
            && document.Latitude == null)
        {
            assignment = FieldAssignmentStatus.Manual;
        }

        return new MediaAttachment
        {
            Id = document.Id,
            OwnerType = ownerType,
            OwnerId = document.OwnerId,
            FieldId = document.FieldId,
            MediaType = document.MediaType,
            Url = document.Url,
            ThumbnailUrl = document.ThumbnailUrl,
            FileName = document.FileName,
            ContentType = document.ContentType,
            UploadedByUserId = document.UploadedByUserId,
            CapturedAt = document.CapturedAt,
            Latitude = document.Latitude,
            Longitude = document.Longitude,
            FieldAssignment = assignment,
            FieldMatchScore = document.FieldMatchScore,
            Kind = PhotoKindExtensions.FromApiString(document.Kind),
            ContentHash = document.ContentHash,
            Width = document.Width,
            Height = document.Height,
            Orientation = document.Orientation,
            ByteSize = document.ByteSize,
            AssignmentReason = document.AssignmentReason,
            Caption = document.Caption,
            LinkedTitle = document.LinkedTitle,
            LinkedOccurredAt = document.LinkedOccurredAt,
            LinkedStatus = document.LinkedStatus,
            DeletedAt = document.DeletedAt,
            DeletedByUserId = document.DeletedByUserId,
            CreatedAt = document.CreatedAt,
            UpdatedAt = document.UpdatedAt
        };
    }

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
        CapturedAt = entity.CapturedAt,
        Latitude = entity.Latitude,
        Longitude = entity.Longitude,
        FieldAssignment = entity.FieldAssignment.ToApiString(),
        FieldMatchScore = entity.FieldMatchScore,
        Kind = entity.Kind.ToApiString(),
        ContentHash = entity.ContentHash,
        Width = entity.Width,
        Height = entity.Height,
        Orientation = entity.Orientation,
        ByteSize = entity.ByteSize,
        AssignmentReason = entity.AssignmentReason,
        Caption = entity.Caption,
        LinkedTitle = entity.LinkedTitle,
        LinkedOccurredAt = entity.LinkedOccurredAt,
        LinkedStatus = entity.LinkedStatus,
        DeletedAt = entity.DeletedAt,
        DeletedByUserId = entity.DeletedByUserId,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
