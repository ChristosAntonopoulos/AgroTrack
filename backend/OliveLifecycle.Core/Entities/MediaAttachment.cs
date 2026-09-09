using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Reusable image attachment owned by a Note, Task, or Harvest.
/// </summary>
public class MediaAttachment : BaseEntity
{
    public MediaOwnerType OwnerType { get; set; }
    public string OwnerId { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string MediaType { get; set; } = "image";
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? FileName { get; set; }
    public string? ContentType { get; set; }
    public string UploadedByUserId { get; set; } = string.Empty;
}
