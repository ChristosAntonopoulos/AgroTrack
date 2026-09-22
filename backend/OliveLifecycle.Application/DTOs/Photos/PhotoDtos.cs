namespace OliveLifecycle.Application.DTOs.Photos;

public class PhotoDto
{
    public string Id { get; set; } = string.Empty;
    public string OwnerType { get; set; } = "field";
    public string OwnerId { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string? FieldName { get; set; }
    public string MediaType { get; set; } = "image";
    /// <summary>Short-lived signed content URL for the original.</summary>
    public string Url { get; set; } = string.Empty;
    /// <summary>Short-lived signed content URL for the thumbnail.</summary>
    public string? ThumbnailUrl { get; set; }
    public string? FileName { get; set; }
    public string? ContentType { get; set; }
    public string UploadedByUserId { get; set; } = string.Empty;
    public DateTime? CapturedAt { get; set; }
    public DateTime EffectiveCapturedAt { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string FieldAssignment { get; set; } = "unassigned";
    public double? FieldMatchScore { get; set; }
    public string? AssignmentReason { get; set; }
    public string? Caption { get; set; }
    public string Kind { get; set; } = "general";
    public string? ContentHash { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public long? ByteSize { get; set; }
    public bool IsLinked { get; set; }
    public string? LinkedTitle { get; set; }
    public DateTime? LinkedOccurredAt { get; set; }
    public string? LinkedStatus { get; set; }
    public bool LinkBroken { get; set; }
    public bool CanTrash { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class PhotoFieldCandidateDto
{
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public double? Score { get; set; }
    public double? DistanceMetres { get; set; }
}

public class PhotoUploadResultDto
{
    public PhotoDto Photo { get; set; } = new();
    public bool DuplicateWarning { get; set; }
    /// <summary>True when an identical hash+field photo already existed and no new row was created.</summary>
    public bool DuplicateSkipped { get; set; }
    public bool Failed { get; set; }
    public string? Error { get; set; }
    public IReadOnlyList<PhotoFieldCandidateDto> Candidates { get; set; } = Array.Empty<PhotoFieldCandidateDto>();
}

public class PhotoListDto
{
    public IReadOnlyList<PhotoDto> Items { get; set; } = Array.Empty<PhotoDto>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class ConfirmPhotoFieldDto
{
    public string FieldId { get; set; } = string.Empty;
}

public class UpdatePhotoDto
{
    public string? Kind { get; set; }
    public DateTime? CapturedAt { get; set; }
    /// <summary>Null leaves the caption unchanged. Empty clears it.</summary>
    public string? Caption { get; set; }
}

public class LinkPhotoDto
{
    public string OwnerType { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
}

public class PhotoQueryDto
{
    public string? FieldId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? FieldAssignment { get; set; }
    public string? OwnerType { get; set; }
    /// <summary>standalone | linked | all</summary>
    public string? LinkStatus { get; set; }
    /// <summary>newest (default) or oldest, by capture time.</summary>
    public string? Sort { get; set; }
    public bool TrashedOnly { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 48;
}

public sealed class PhotoContentResult
{
    public required Stream Content { get; init; }
    public required string ContentType { get; init; }
    public string? FileName { get; init; }
}
