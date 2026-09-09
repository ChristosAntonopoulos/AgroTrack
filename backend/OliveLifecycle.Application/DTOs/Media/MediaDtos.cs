namespace OliveLifecycle.Application.DTOs.Media;

public class MediaAttachmentDto
{
    public string Id { get; set; } = string.Empty;
    public string OwnerType { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string MediaType { get; set; } = "image";
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? FileName { get; set; }
    public string? ContentType { get; set; }
    public string UploadedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class AttachMediaDto
{
    public string OwnerType { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public List<string> Urls { get; set; } = new();
}
