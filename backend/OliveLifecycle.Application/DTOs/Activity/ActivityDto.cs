namespace OliveLifecycle.Application.DTOs.Activity;

public class ActivityDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActorUserId { get; set; }
    public string? TaskId { get; set; }
    public DateTime Timestamp { get; set; }
    public Dictionary<string, string>? Metadata { get; set; }
}
