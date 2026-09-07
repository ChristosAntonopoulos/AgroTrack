using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

public class TaskItem : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public string? TemplateId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string LifecycleYear { get; set; } = "low";
    public HarvestPhase? HarvestPhase { get; set; }
    public string? AssignedTo { get; set; }
    public WorkTaskStatus Status { get; set; } = WorkTaskStatus.Pending;
    public DateTime? ScheduledStart { get; set; }
    public DateTime? ScheduledEnd { get; set; }
    public DateTime? ActualStart { get; set; }
    public DateTime? ActualEnd { get; set; }
    public decimal? Cost { get; set; }
    public ApprovalStatus ApprovalStatus { get; set; } = ApprovalStatus.NotRequired;
    public string? ApprovalNote { get; set; }
    public List<Evidence> Evidence { get; set; } = new();
    public string? Notes { get; set; }
}

public class Evidence
{
    public string? PhotoUrl { get; set; }
    public string? Notes { get; set; }
    public string? Kind { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
