namespace OliveLifecycle.Application.DTOs.Lifecycle;

public class LifecycleDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string CurrentYear { get; set; } = "low";
    public DateTime CycleStartDate { get; set; }
    public DateTime? LastProgressionDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
