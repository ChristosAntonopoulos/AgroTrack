using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Core.Entities.FieldWork;

/// <summary>Planned future work. Distinct from WorkRecord (past work) and suggestions.</summary>
public class FieldTask : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public string? TemplateCode { get; set; }
    public int? TemplateVersion { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public FieldTaskStatus Status { get; set; } = FieldTaskStatus.Planned;

    /// <summary>Account/owner scope for the task.</summary>
    public string OwnerId { get; set; } = string.Empty;

    public TaskSource Source { get; set; } = TaskSource.Custom;
    public TaskTimingBucket TimingBucket { get; set; } = TaskTimingBucket.Later;

    /// <summary>Preferred scheduled date (day). Aliases PlannedStart for views.</summary>
    public DateTime? ScheduledFor { get; set; }

    public DateTime? PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }
    public string? PreferredTimeWindow { get; set; }

    public string? AssigneeId { get; set; }
    public string? AssignedUserId { get; set; }
    public string? AssignedCollaboratorId { get; set; }
    public string? ResponsibleUserId { get; set; }
    public List<string> AdditionalParticipantUserIds { get; set; } = [];
    public TaskAssignmentResponse AssignmentResponse { get; set; } = TaskAssignmentResponse.Pending;
    public DateTime? AssignmentRespondedAt { get; set; }
    public string? ProposalId { get; set; }
    public List<FieldTaskChecklistItem> ChecklistSnapshot { get; set; } = [];
    public decimal? EstimatedCost { get; set; }
    public string? EstimatedCostCurrency { get; set; } = "EUR";
    public decimal? EstimatedLabourHours { get; set; }
    public string? Notes { get; set; }
    public string? Note { get; set; }
    public List<string> AttachmentIds { get; set; } = [];
    public string? RelatedHarvestId { get; set; }
    public string? WeatherEvaluationId { get; set; }
    public WeatherSuitability WeatherSuitability { get; set; } = WeatherSuitability.Unknown;

    /// <summary>Optional PPP label constraints used by weather ranking.</summary>
    public PlantProtectionProductLabel? ProductLabel { get; set; }

    /// <summary>Legacy pointer to latest execution; prefer <see cref="LinkedWorkRecordId"/>.</summary>
    public string? LatestExecutionId { get; set; }

    /// <summary>Bidirectional link to an independent WorkRecord.</summary>
    public string? LinkedWorkRecordId { get; set; }

    public DateTime? CompletedAt { get; set; }
    public string? CompletedByUserId { get; set; }
    public DateTime? SkippedAt { get; set; }
    public string? SkippedReason { get; set; }

    /// <summary>Optional recurrence rule (opaque string for Phase 1).</summary>
    public string? Recurrence { get; set; }

    /// <summary>When the farmer pressed Start (legacy; not a status).</summary>
    public DateTime? StartedAt { get; set; }

    public bool IsPaused { get; set; }
    public string? PauseReason { get; set; }
    public DateTime? PausedAt { get; set; }

    /// <summary>Groups tasks created together for multiple fields.</summary>
    public string? WorkGroupId { get; set; }

    public string? BlockedReason { get; set; }

    /// <summary>Audit of status changes. Reopening does not erase earlier events.</summary>
    public List<FieldTaskActivity> Activity { get; set; } = [];

    public string CreatedByUserId { get; set; } = string.Empty;

    /// <summary>Effective assignee for display/filtering.</summary>
    public string? EffectiveAssigneeId =>
        !string.IsNullOrWhiteSpace(AssigneeId) ? AssigneeId
        : !string.IsNullOrWhiteSpace(AssignedUserId) ? AssignedUserId
        : ResponsibleUserId;
}
