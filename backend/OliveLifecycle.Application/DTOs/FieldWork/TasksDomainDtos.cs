namespace OliveLifecycle.Application.DTOs.FieldWork;

public class TaskDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public string OwnerId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "planned";
    public string StatusLabel { get; set; } = string.Empty;
    public string Source { get; set; } = "custom";
    public string? TemplateCode { get; set; }
    public string TimingBucket { get; set; } = "later";
    public DateTime? ScheduledFor { get; set; }
    public DateTime? PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }
    public string? AssigneeId { get; set; }
    public string? AssignedUserId { get; set; }
    public string? AssignedCollaboratorId { get; set; }
    public string? Note { get; set; }
    public string? Notes { get; set; }
    public string? Recurrence { get; set; }
    public List<FieldTaskChecklistItemDto> Checklist { get; set; } = [];
    public string? LinkedWorkRecordId { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? CompletedByUserId { get; set; }
    public DateTime? SkippedAt { get; set; }
    public string? SkippedReason { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateTaskDto
{
    public string FieldId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? TemplateCode { get; set; }
    /// <summary>today | tomorrow | thisWeek | later</summary>
    public string? TimingBucket { get; set; }
    public DateTime? ScheduledFor { get; set; }
    public DateTime? PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }
    public string? AssigneeId { get; set; }
    public string? AssignedUserId { get; set; }
    public string? AssignedCollaboratorId { get; set; }
    public string? Note { get; set; }
    public string? Notes { get; set; }
    public string? Recurrence { get; set; }
    public int? ResultYear { get; set; }
    public string? RelatedHarvestId { get; set; }
    /// <summary>Create-time checklist lines (one action per item).</summary>
    public List<CreateTaskChecklistItemDto>? Checklist { get; set; }
    public string? IdempotencyKey { get; set; }
}

public class CreateTaskChecklistItemDto
{
    public string? Key { get; set; }
    /// <summary>Preferred label for a new checklist line.</summary>
    public string? Label { get; set; }
    /// <summary>Accepted as label alias for older clients.</summary>
    public string? TextValue { get; set; }
}

public class PatchTaskDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? TimingBucket { get; set; }
    public DateTime? ScheduledFor { get; set; }
    public DateTime? PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }
    public string? AssigneeId { get; set; }
    public string? AssignedUserId { get; set; }
    public string? AssignedCollaboratorId { get; set; }
    public string? Note { get; set; }
    public string? Notes { get; set; }
    public string? Recurrence { get; set; }
    public int? ResultYear { get; set; }
}

public class SkipTaskDto
{
    public string? Reason { get; set; }
}

public class LinkWorkRecordDto
{
    public string WorkRecordId { get; set; } = string.Empty;
}

public class WorkRecordDto
{
    public string Id { get; set; } = string.Empty;
    public string? LinkedTaskId { get; set; }
    public string? TaskId { get; set; }
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public string OwnerId { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? TemplateCode { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime CompletedAt { get; set; }
    public string Outcome { get; set; } = "completed";
    public string OutcomeLabel { get; set; } = string.Empty;
    public List<string> CompletedByUserIds { get; set; } = [];
    public string? Notes { get; set; }
    public List<string> AttachmentIds { get; set; } = [];
    public string RecordedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    /// <summary>Matching planned tasks when create offered a link.</summary>
    public List<TaskDto> MatchingPlannedTasks { get; set; } = [];
}

public class CreateWorkRecordDto
{
    public string FieldId { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? TemplateCode { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public string? Notes { get; set; }
    public List<string>? AttachmentIds { get; set; }
    public int? ResultYear { get; set; }
    /// <summary>Optional planned task to link; marks that task done.</summary>
    public string? LinkedTaskId { get; set; }
    /// <summary>When true, return matching planned tasks without requiring a link.</summary>
    public bool OfferPlannedTaskMatch { get; set; } = true;
}

public class TaskSuggestionDto
{
    public string TemplateCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public string WhyNow { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime? RecommendedWindowStart { get; set; }
    public DateTime? RecommendedWindowEnd { get; set; }
    public string Confidence { get; set; } = "seasonal_reminder";
}

public class DismissTaskSuggestionDto
{
    public string FieldId { get; set; } = string.Empty;
    public string TemplateCode { get; set; } = string.Empty;
    public int? ResultYear { get; set; }
}
