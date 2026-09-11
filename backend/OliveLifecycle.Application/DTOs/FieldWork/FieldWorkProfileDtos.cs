namespace OliveLifecycle.Application.DTOs.FieldWork;

public class FieldWorkProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public int ResultYearCreated { get; set; }
    public int ProfileVersion { get; set; }
    public int OnboardingVersion { get; set; }
    public string Status { get; set; } = "draft";
    public string StatusLabel { get; set; } = string.Empty;
    public string ProductionPurpose { get; set; } = "unknown";
    public string ProductionPurposeLabel { get; set; } = string.Empty;
    public IrrigationProfileDto Irrigation { get; set; } = new();
    public PracticeProfileDto Pruning { get; set; } = new();
    public FertilisationProfileDto Fertilisation { get; set; } = new();
    public GroundCoverProfileDto GroundCover { get; set; } = new();
    public PestManagementProfileDto PestManagement { get; set; } = new();
    public AnalysisProfileDto Analysis { get; set; } = new();
    public HarvestProfileDto Harvest { get; set; } = new();
    public DefaultAssignmentsDto DefaultAssignments { get; set; } = new();
    public NotificationPreferenceDto NotificationPreference { get; set; } = new();
    public List<CurrentYearDeclaredWorkDto> CurrentYearDeclaredWork { get; set; } = [];
    public DateTime? CompletedAt { get; set; }
    public string? CompletedByUserId { get; set; }
    public DateTime? LastReviewedAt { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
    public string? UpdatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class PracticeProfileDto
{
    public string PreferenceMode { get; set; } = "unknown";
    public string PreferenceModeLabel { get; set; } = string.Empty;
    public string FrequencyType { get; set; } = "unknown";
    public string FrequencyTypeLabel { get; set; } = string.Empty;
    public int? FrequencyValue { get; set; }
    public List<int> PreferredMonths { get; set; } = [];
    public int? LastPerformedYear { get; set; }
    public int? LastPerformedMonth { get; set; }
    public string? DatePrecision { get; set; }
    public string? DatePrecisionLabel { get; set; }
    public string? DefaultAssigneeId { get; set; }
    public string? UserNotes { get; set; }
    public string Source { get; set; } = "unknown";
    public DateTime? ConfirmedAt { get; set; }
}

public class IrrigationProfileDto : PracticeProfileDto
{
    public string Method { get; set; } = "unknown";
    public string DecisionMaker { get; set; } = "unknown";
}

public class FertilisationProfileDto : PracticeProfileDto
{
    public string DecisionMaker { get; set; } = "unknown";
}

public class GroundCoverProfileDto : PracticeProfileDto
{
    public List<string> Methods { get; set; } = [];
}

public class PestManagementProfileDto : PracticeProfileDto
{
    public string DecisionApproach { get; set; } = "unknown";
    public string TrapStatus { get; set; } = "unknown";
}

public class AnalysisKindEntryDto
{
    public string Kind { get; set; } = "unknown";
    public int? LastPerformedYear { get; set; }
    public string? DatePrecision { get; set; }
}

public class AnalysisProfileDto : PracticeProfileDto
{
    public List<AnalysisKindEntryDto> Kinds { get; set; } = [];
}

public class HarvestProfileDto : PracticeProfileDto
{
    public int? ExpectedStartMonth { get; set; }
    public string Organizer { get; set; } = "unknown";
    public string NeedsMillBooking { get; set; } = "unknown";
}

public class DefaultAssignmentEntryDto
{
    public string Category { get; set; } = string.Empty;
    public string? AssigneeUserId { get; set; }
    public bool IsSelf { get; set; }
}

public class DefaultAssignmentsDto
{
    public List<DefaultAssignmentEntryDto> Entries { get; set; } = [];
}

public class NotificationPreferenceDto
{
    public string Intensity { get; set; } = "unknown";
    public string IntensityLabel { get; set; } = string.Empty;
    public int AcceptedTaskReminderDaysBefore { get; set; } = 3;
}

public class ApproximateDateDto
{
    public int? Year { get; set; }
    public int? Month { get; set; }
    public int? Day { get; set; }
    public string Precision { get; set; } = "year";
    public string? PrecisionLabel { get; set; }
}

public class CurrentYearDeclaredWorkDto
{
    public string Category { get; set; } = string.Empty;
    public string? TemplateCode { get; set; }
    public int ResultYear { get; set; }
    public string Completion { get; set; } = "unknown";
    public ApproximateDateDto? ApproximateDate { get; set; }
    public string Source { get; set; } = "user_declared_during_onboarding";
}

public class CreateFieldWorkProfileDto
{
    public int? ResultYearCreated { get; set; }
}

/// <summary>Partial update used for resume / save-answers while Draft (and later edits while Active).</summary>
public class UpdateFieldWorkProfileDto
{
    public string? ProductionPurpose { get; set; }
    public UpdateIrrigationProfileDto? Irrigation { get; set; }
    public UpdatePracticeProfileDto? Pruning { get; set; }
    public UpdateFertilisationProfileDto? Fertilisation { get; set; }
    public UpdateGroundCoverProfileDto? GroundCover { get; set; }
    public UpdatePestManagementProfileDto? PestManagement { get; set; }
    public UpdateAnalysisProfileDto? Analysis { get; set; }
    public UpdateHarvestProfileDto? Harvest { get; set; }
    public DefaultAssignmentsDto? DefaultAssignments { get; set; }
    public UpdateNotificationPreferenceDto? NotificationPreference { get; set; }
    public List<CurrentYearDeclaredWorkDto>? CurrentYearDeclaredWork { get; set; }
}

public class UpdatePracticeProfileDto
{
    public string? PreferenceMode { get; set; }
    public string? FrequencyType { get; set; }
    public int? FrequencyValue { get; set; }
    public List<int>? PreferredMonths { get; set; }
    public int? LastPerformedYear { get; set; }
    public int? LastPerformedMonth { get; set; }
    public string? DatePrecision { get; set; }
    public string? DefaultAssigneeId { get; set; }
    public string? UserNotes { get; set; }
    public string? Source { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public bool ClearFrequencyValue { get; set; }
    public bool ClearLastPerformedYear { get; set; }
    public bool ClearLastPerformedMonth { get; set; }
    public bool ClearDatePrecision { get; set; }
    public bool ClearDefaultAssigneeId { get; set; }
}

public class UpdateIrrigationProfileDto : UpdatePracticeProfileDto
{
    public string? Method { get; set; }
    public string? DecisionMaker { get; set; }
}

public class UpdateFertilisationProfileDto : UpdatePracticeProfileDto
{
    public string? DecisionMaker { get; set; }
}

public class UpdateGroundCoverProfileDto : UpdatePracticeProfileDto
{
    public List<string>? Methods { get; set; }
}

public class UpdatePestManagementProfileDto : UpdatePracticeProfileDto
{
    public string? DecisionApproach { get; set; }
    public string? TrapStatus { get; set; }
}

public class UpdateAnalysisProfileDto : UpdatePracticeProfileDto
{
    public List<AnalysisKindEntryDto>? Kinds { get; set; }
}

public class UpdateHarvestProfileDto : UpdatePracticeProfileDto
{
    public int? ExpectedStartMonth { get; set; }
    public string? Organizer { get; set; }
    public string? NeedsMillBooking { get; set; }
    public bool ClearExpectedStartMonth { get; set; }
}

public class UpdateNotificationPreferenceDto
{
    public string? Intensity { get; set; }
    public int? AcceptedTaskReminderDaysBefore { get; set; }
}

public class ActivateFieldWorkProfileDto
{
    /// <summary>Optional; defaults to Active.</summary>
    public string? Status { get; set; }
}

/// <summary>
/// Copy practice preferences to other Active fields.
/// Irrigation / last-performed / assignments are off by default and require explicit flags.
/// </summary>
public class CopyFieldWorkProfileDto
{
    public List<string> TargetFieldIds { get; set; } = [];

    /// <summary>When false (default), target irrigation stays unchanged / unknown.</summary>
    public bool CopyIrrigation { get; set; }

    /// <summary>When false (default), last-performed dates are not copied.</summary>
    public bool CopyLastPerformed { get; set; }

    /// <summary>
    /// When false (default), default assignees are not copied.
    /// When true, only assignees who already have access on the target field are kept.
    /// </summary>
    public bool CopyAssignments { get; set; }
}

public class CopyFieldWorkProfileResultDto
{
    public string SourceFieldId { get; set; } = string.Empty;
    public List<CopyFieldWorkProfileTargetResultDto> Results { get; set; } = [];
}

public class CopyFieldWorkProfileTargetResultDto
{
    public string FieldId { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? ProfileId { get; set; }
    public string? ProfileStatus { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public List<string> SkippedAssignmentUserIds { get; set; } = [];
}

/// <summary>
/// Dry-run year plan from FieldWorkProfile eligibility (Draft or Active).
/// Never creates FieldTasks or TaskProposals.
/// </summary>
public class FieldWorkPlanPreviewDto
{
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public string ProfileStatus { get; set; } = "draft";
    public bool UsedDraftAsPreview { get; set; }
    public int EnabledCount { get; set; }
    public int AskFirstCount { get; set; }
    public int SuppressedCount { get; set; }
    public List<FieldWorkPlanPreviewItemDto> Enabled { get; set; } = [];
    public List<FieldWorkPlanPreviewItemDto> AskFirst { get; set; } = [];
    public List<FieldWorkPlanPreviewItemDto> Suppressed { get; set; } = [];
}

public class FieldWorkPlanPreviewItemDto
{
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public string EligibilityStatus { get; set; } = "enabled";
    public string ReasonCode { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    /// <summary>Practice bucket for UI jump-back (e.g. pruning, irrigation).</summary>
    public string PracticeCategory { get; set; } = "other";
    /// <summary>Usual season window for this template in the result year (UTC date).</summary>
    public DateTime? WindowStart { get; set; }
    public DateTime? WindowEnd { get; set; }
}

// --- Phase 6 ongoing learning (explicit user confirmation required) ---

public class DismissalLearningEvaluateDto
{
    public string TemplateCode { get; set; } = string.Empty;
}

public class DismissalLearningEvaluateResultDto
{
    public bool ShouldPrompt { get; set; }
    public int DismissCount { get; set; }
    public int Threshold { get; set; }
    public string TemplateCode { get; set; } = string.Empty;
    public string PracticeCategory { get; set; } = "other";
    public string CurrentPreferenceMode { get; set; } = "unknown";
    public string PromptMessage { get; set; } = string.Empty;
}

public class DismissalLearningApplyDto
{
    public string TemplateCode { get; set; } = string.Empty;
    /// <summary>dont_propose | ask_when_indicated | keep_proposing</summary>
    public string Choice { get; set; } = string.Empty;
}

public class CompletionLearningEvaluateDto
{
    public string TemplateCode { get; set; } = string.Empty;
    public string? Outcome { get; set; }
    public int? ResultYear { get; set; }
}

public class CompletionLearningEvaluateResultDto
{
    public bool ShouldPrompt { get; set; }
    public string TemplateCode { get; set; } = string.Empty;
    public string PracticeCategory { get; set; } = "other";
    public int ResultYear { get; set; }
    public int SuggestNextYear { get; set; }
    public string PromptMessage { get; set; } = string.Empty;
}

public class CompletionLearningApplyDto
{
    public string TemplateCode { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    /// <summary>every_2_years | every_year | when_needed | no_change</summary>
    public string Choice { get; set; } = string.Empty;
}

public class MarkProfileReviewedDto
{
    /// <summary>Optional; when answering a single incremental onboarding question.</summary>
    public string? IncrementalQuestionId { get; set; }
}

public class FieldWorkLearningStatusDto
{
    public bool AnnualReviewDue { get; set; }
    public DateTime? LastReviewedAt { get; set; }
    public int OnboardingVersion { get; set; }
    public int CurrentOnboardingVersion { get; set; }
    public bool HasIncrementalQuestions { get; set; }
    public List<string> PendingIncrementalQuestionIds { get; set; } = [];
    /// <summary>
    /// Version bump path: raise FieldWorkProfile.CurrentOnboardingVersion and register
    /// new question ids in FieldWorkLearning.IncrementalQuestionIdsForVersion — never force full restart.
    /// </summary>
    public string IncrementalOnboardingNote { get; set; } =
        "Bump CurrentOnboardingVersion and register new question ids; ask only new questions.";
}
