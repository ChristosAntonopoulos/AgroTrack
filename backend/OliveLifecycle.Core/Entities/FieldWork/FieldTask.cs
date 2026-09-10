using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Core.Entities.FieldWork;

/// <summary>Real task accepted or manually created by the user.</summary>
public class FieldTask : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public string? TemplateCode { get; set; }
    public int? TemplateVersion { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public FieldTaskStatus Status { get; set; } = FieldTaskStatus.Planned;
    public DateTime? PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }
    public string? PreferredTimeWindow { get; set; }
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
    public List<string> AttachmentIds { get; set; } = [];
    public string? RelatedHarvestId { get; set; }
    public string? WeatherEvaluationId { get; set; }
    public WeatherSuitability WeatherSuitability { get; set; } = WeatherSuitability.Unknown;

    /// <summary>Optional PPP label constraints used by the Phase 4 weather ranking.</summary>
    public PlantProtectionProductLabel? ProductLabel { get; set; }

    public string? LatestExecutionId { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
}
