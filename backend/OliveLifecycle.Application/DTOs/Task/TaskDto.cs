namespace OliveLifecycle.Application.DTOs.Task;

public class TaskDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string? TemplateId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string LifecycleYear { get; set; } = "low";
    public string? AssignedTo { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime? ScheduledStart { get; set; }
    public DateTime? ScheduledEnd { get; set; }
    public DateTime? ActualStart { get; set; }
    public DateTime? ActualEnd { get; set; }
    public decimal? Cost { get; set; }
    public List<EvidenceDto> Evidence { get; set; } = new();
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class EvidenceDto
{
    public string? PhotoUrl { get; set; }
    public string? Notes { get; set; }
    public DateTime Timestamp { get; set; }
}
