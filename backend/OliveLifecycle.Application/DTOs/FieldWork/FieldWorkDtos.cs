using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.DTOs.FieldWork;

public class FieldWorkTemplateDto
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int CurrentVersion { get; set; }
    public string GreekName { get; set; } = string.Empty;
    public string EnglishName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}

public class TaskProposalDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public string TemplateCode { get; set; } = string.Empty;
    public int TemplateVersion { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public string SourceTypeLabel { get; set; } = string.Empty;
    public string? SourceReference { get; set; }
    public DateTime GeneratedAt { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidUntil { get; set; }
    public string Confidence { get; set; } = string.Empty;
    public string ConfidenceLabel { get; set; } = string.Empty;
    public List<string> ReasonCodes { get; set; } = [];
    public string Explanation { get; set; } = string.Empty;
    public string GreekExplanation { get; set; } = string.Empty;
    public string? EnglishExplanation { get; set; }
    public string? RequiredEvidence { get; set; }
    public DateTime? RecommendedWindowStart { get; set; }
    public DateTime? RecommendedWindowEnd { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public string? AcceptedTaskId { get; set; }
    public DateTime? SnoozeUntil { get; set; }
}

public class AcceptTaskProposalDto
{
    public DateTime? PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }
    public string? AssignedUserId { get; set; }
    public string? AssignedCollaboratorId { get; set; }
    public string? Notes { get; set; }
    public int? ResultYear { get; set; }
}

public class SnoozeTaskProposalDto
{
    public DateTime? Until { get; set; }
}

public class DismissTaskProposalDto
{
    /// <summary>not_for_this_field | dismiss_for_year</summary>
    public string Decision { get; set; } = "dismiss_for_year";
}

public class CreateFieldTaskDto
{
    public string FieldId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? TemplateCode { get; set; }
    public DateTime? PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }
    public string? PreferredTimeWindow { get; set; }
    public string? AssignedUserId { get; set; }
    public string? AssignedCollaboratorId { get; set; }
    public string? Notes { get; set; }
    public decimal? EstimatedCost { get; set; }
    public int? ResultYear { get; set; }
    public string? RelatedHarvestId { get; set; }
}

public class UpdateFieldTaskDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public DateTime? PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }
    public string? PreferredTimeWindow { get; set; }
    public string? Notes { get; set; }
    public decimal? EstimatedCost { get; set; }
    public int? ResultYear { get; set; }
}

public class RescheduleFieldTaskDto
{
    public DateTime PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }
    public string? PreferredTimeWindow { get; set; }
    public int? ResultYear { get; set; }
}

public class AssignFieldTaskDto
{
    public string? AssignedUserId { get; set; }
    public string? AssignedCollaboratorId { get; set; }
    public string? ResponsibleUserId { get; set; }
    public List<string>? AdditionalParticipantUserIds { get; set; }
}

public class CompleteFieldTaskDto
{
    public string Outcome { get; set; } = "completed";
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }
    public List<string>? AttachmentIds { get; set; }
    public List<ChecklistAnswerDto>? ChecklistAnswers { get; set; }
    public double? TreatedAreaHectares { get; set; }
    public bool CreateFollowUpForRemainder { get; set; } = true;
}

public class ChecklistAnswerDto
{
    public string Key { get; set; } = string.Empty;
    public string? TextValue { get; set; }
    public decimal? NumberValue { get; set; }
    public bool? BoolValue { get; set; }
    public List<string>? AttachmentIds { get; set; }
}

public class FieldTaskDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public string? TemplateCode { get; set; }
    public int? TemplateVersion { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public DateTime? PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }
    public string? PreferredTimeWindow { get; set; }
    public string? AssignedUserId { get; set; }
    public string? AssignedCollaboratorId { get; set; }
    public string? ResponsibleUserId { get; set; }
    public List<string> AdditionalParticipantUserIds { get; set; } = [];
    public string AssignmentResponse { get; set; } = string.Empty;
    public string? ProposalId { get; set; }
    public List<FieldTaskChecklistItemDto> Checklist { get; set; } = [];
    public decimal? EstimatedCost { get; set; }
    public string? EstimatedCostCurrency { get; set; }
    public string? Notes { get; set; }
    public List<string> AttachmentIds { get; set; } = [];
    public string? RelatedHarvestId { get; set; }
    public string WeatherSuitability { get; set; } = string.Empty;
    public string WeatherSuitabilityLabel { get; set; } = string.Empty;
    public string? LatestExecutionId { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FieldTaskChecklistItemDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string GreekLabel { get; set; } = string.Empty;
    public string EnglishLabel { get; set; } = string.Empty;
    public string ItemType { get; set; } = string.Empty;
    public string Requirement { get; set; } = string.Empty;
    public bool IsEssential { get; set; }
    public int SortOrder { get; set; }
    public bool IsAnswered { get; set; }
    public string? TextValue { get; set; }
    public decimal? NumberValue { get; set; }
    public bool? BoolValue { get; set; }
    public List<string> AttachmentIds { get; set; } = [];
    public List<string> Choices { get; set; } = [];
    public string? Unit { get; set; }
}

public class TaskExecutionDto
{
    public string Id { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime CompletedAt { get; set; }
    public string Outcome { get; set; } = string.Empty;
    public string OutcomeLabel { get; set; } = string.Empty;
    public List<string> CompletedByUserIds { get; set; } = [];
    public string? Notes { get; set; }
    public List<string> AttachmentIds { get; set; } = [];
    public bool FollowUpRequired { get; set; }
    public string? FollowUpTaskId { get; set; }
}

public class FieldPhenologyDto
{
    public string FieldId { get; set; } = string.Empty;
    public bool IsKnown { get; set; }
    public string StageCode { get; set; } = "unknown";
    public string StageLabel { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? RecordStageActionLabel { get; set; }
    public DateTime? ObservedOn { get; set; }
    public string? Source { get; set; }
    public string? Confidence { get; set; }
    public string? ConfidenceLabel { get; set; }
    public string? ObservationId { get; set; }
    public List<string> PhotoIds { get; set; } = [];
    public string? Notes { get; set; }
}

public class CreateFieldPhenologyObservationDto
{
    public string StageCode { get; set; } = string.Empty;
    public DateTime? ObservedOn { get; set; }
    public string? Source { get; set; }
    public string? Confidence { get; set; }
    public List<string>? PhotoIds { get; set; }
    public string? Notes { get; set; }
}

public class FieldPhenologyObservationDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string StageCode { get; set; } = string.Empty;
    public string StageLabel { get; set; } = string.Empty;
    public DateTime ObservedOn { get; set; }
    public string Source { get; set; } = string.Empty;
    public string Confidence { get; set; } = string.Empty;
    public string ConfidenceLabel { get; set; } = string.Empty;
    public List<string> PhotoIds { get; set; } = [];
    public string? Notes { get; set; }
    public string ObservedByUserId { get; set; } = string.Empty;
}

public class FieldYearTaskPlanDto
{
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public DateTime EvaluatedAt { get; set; }
    public List<FieldWorkTemplateDto> Catalogue { get; set; } = [];
    public List<TaskProposalDto> Proposals { get; set; } = [];
    public List<FieldTaskDto> Tasks { get; set; } = [];
    public List<string> InWindowTemplateCodes { get; set; } = [];
}

public class EvaluateTaskProposalsDto
{
    public int? ResultYear { get; set; }
    public bool HasWeatherData { get; set; }
    public string? WeatherSuitability { get; set; }
}
