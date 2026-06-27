namespace OliveLifecycle.Core.Entities;

public class Activity : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActorUserId { get; set; }
    public string? TaskId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public Dictionary<string, string>? Metadata { get; set; }
}
