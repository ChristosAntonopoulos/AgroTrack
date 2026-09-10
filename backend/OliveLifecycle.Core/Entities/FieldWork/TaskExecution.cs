using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities.FieldWork;

/// <summary>Permanent completion record for a FieldTask.</summary>
public class TaskExecution : BaseEntity
{
    public string TaskId { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
    public TaskExecutionOutcome Outcome { get; set; } = TaskExecutionOutcome.Completed;
    public List<string> CompletedByUserIds { get; set; } = [];
    public List<TaskExecutionChecklistResult> ChecklistResults { get; set; } = [];
    public List<TaskMaterial> Materials { get; set; } = [];
    public double? TreatedAreaHectares { get; set; }
    public List<TaskQuantity> Quantities { get; set; } = [];
    public string? Notes { get; set; }
    public List<string> AttachmentIds { get; set; } = [];
    public string? WeatherEvaluationId { get; set; }
    public WeatherSuitability WeatherSuitability { get; set; } = WeatherSuitability.Unknown;
    public bool FollowUpRequired { get; set; }
    public string? FollowUpTaskId { get; set; }
    public string RecordedByUserId { get; set; } = string.Empty;

    /// <summary>Snapshot of the FieldTask plan at completion — never rewritten by weather re-eval.</summary>
    public DateTime? PlannedStartSnapshot { get; set; }
    public DateTime? PlannedEndSnapshot { get; set; }

    /// <summary>When set, this execution is undone and must not appear in Chronologio.</summary>
    public DateTime? UndoneAt { get; set; }
    public string? UndoneByUserId { get; set; }

    public bool IsActive => UndoneAt is null;
}
