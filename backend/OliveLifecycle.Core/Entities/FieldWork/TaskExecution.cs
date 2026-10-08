using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities.FieldWork;

/// <summary>
/// Independent work record of past work. May exist without a planned task.
/// Evolved from the former TaskExecution completion record.
/// </summary>
public class TaskExecution : BaseEntity
{
    /// <summary>Optional link to a FieldTask. Null when recorded without a plan.</summary>
    public string? TaskId { get; set; }

    /// <summary>Alias for <see cref="TaskId"/> — bidirectional link with FieldTask.LinkedWorkRecordId.</summary>
    public string? LinkedTaskId
    {
        get => TaskId;
        set => TaskId = value;
    }

    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public string? Title { get; set; }
    public string? TemplateCode { get; set; }
    public string OwnerId { get; set; } = string.Empty;
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
