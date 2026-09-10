using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents.FieldWork;

public class FieldWorkTaskTemplateDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("code")]
    public string Code { get; set; } = string.Empty;

    [BsonElement("currentVersion")]
    public int CurrentVersion { get; set; } = 1;

    [BsonElement("greekName")]
    public string GreekName { get; set; } = string.Empty;

    [BsonElement("englishName")]
    public string EnglishName { get; set; } = string.Empty;

    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("candidateMonthRange")]
    public MonthDayRangeDocument? CandidateMonthRange { get; set; }

    [BsonElement("candidateBbchRange")]
    public BbchRangeDocument? CandidateBbchRange { get; set; }

    [BsonElement("defaultDurationMinutes")]
    public int? DefaultDurationMinutes { get; set; }

    [BsonElement("requiredFieldCapabilities")]
    public List<string> RequiredFieldCapabilities { get; set; } = [];

    [BsonElement("weatherRuleProfile")]
    public string? WeatherRuleProfile { get; set; }

    [BsonElement("completionSchema")]
    public string? CompletionSchema { get; set; }

    [BsonElement("financialCategorySuggestion")]
    public string? FinancialCategorySuggestion { get; set; }

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class FieldWorkTaskTemplateVersionDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("templateCode")]
    public string TemplateCode { get; set; } = string.Empty;

    [BsonElement("version")]
    public int Version { get; set; } = 1;

    [BsonElement("greekName")]
    public string GreekName { get; set; } = string.Empty;

    [BsonElement("englishName")]
    public string EnglishName { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("candidateMonthRange")]
    public MonthDayRangeDocument? CandidateMonthRange { get; set; }

    [BsonElement("candidateBbchRange")]
    public BbchRangeDocument? CandidateBbchRange { get; set; }

    [BsonElement("defaultDurationMinutes")]
    public int? DefaultDurationMinutes { get; set; }

    [BsonElement("defaultChecklist")]
    public List<TaskChecklistDefinitionDocument> DefaultChecklist { get; set; } = [];

    [BsonElement("requiredFieldCapabilities")]
    public List<string> RequiredFieldCapabilities { get; set; } = [];

    [BsonElement("weatherRuleProfile")]
    public string? WeatherRuleProfile { get; set; }

    [BsonElement("completionSchema")]
    public string? CompletionSchema { get; set; }

    [BsonElement("financialCategorySuggestion")]
    public string? FinancialCategorySuggestion { get; set; }

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class TaskProposalDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("fieldId")]
    public string FieldId { get; set; } = string.Empty;

    [BsonElement("resultYear")]
    public int ResultYear { get; set; }

    [BsonElement("templateCode")]
    public string TemplateCode { get; set; } = string.Empty;

    [BsonElement("templateVersion")]
    public int TemplateVersion { get; set; } = 1;

    [BsonElement("sourceType")]
    public string SourceType { get; set; } = "seasonal_baseline";

    [BsonElement("sourceReference")]
    public string? SourceReference { get; set; }

    [BsonElement("generatedAt")]
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("validFrom")]
    public DateTime? ValidFrom { get; set; }

    [BsonElement("validUntil")]
    public DateTime? ValidUntil { get; set; }

    [BsonElement("confidence")]
    public string Confidence { get; set; } = "seasonal_reminder";

    [BsonElement("reasonCodes")]
    public List<string> ReasonCodes { get; set; } = [];

    [BsonElement("greekExplanation")]
    public string GreekExplanation { get; set; } = string.Empty;

    [BsonElement("englishExplanation")]
    public string? EnglishExplanation { get; set; }

    [BsonElement("requiredEvidence")]
    public string? RequiredEvidence { get; set; }

    [BsonElement("weatherEvaluationId")]
    public string? WeatherEvaluationId { get; set; }

    [BsonElement("recommendedWindowStart")]
    public DateTime? RecommendedWindowStart { get; set; }

    [BsonElement("recommendedWindowEnd")]
    public DateTime? RecommendedWindowEnd { get; set; }

    [BsonElement("dedupKey")]
    public string DedupKey { get; set; } = string.Empty;

    /// <summary>Set only while the proposal is open so uniqueness can use a sparse index.</summary>
    [BsonElement("openDedupKey")]
    [BsonIgnoreIfNull]
    public string? OpenDedupKey { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "active";

    [BsonElement("decision")]
    public string? Decision { get; set; }

    [BsonElement("decisionAt")]
    public DateTime? DecisionAt { get; set; }

    [BsonElement("decisionByUserId")]
    public string? DecisionByUserId { get; set; }

    [BsonElement("acceptedTaskId")]
    public string? AcceptedTaskId { get; set; }

    [BsonElement("snoozeUntil")]
    public DateTime? SnoozeUntil { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class FieldTaskDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("fieldId")]
    public string FieldId { get; set; } = string.Empty;

    [BsonElement("resultYear")]
    public int ResultYear { get; set; }

    [BsonElement("templateCode")]
    public string? TemplateCode { get; set; }

    [BsonElement("templateVersion")]
    public int? TemplateVersion { get; set; }

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "planned";

    [BsonElement("plannedStart")]
    public DateTime? PlannedStart { get; set; }

    [BsonElement("plannedEnd")]
    public DateTime? PlannedEnd { get; set; }

    [BsonElement("preferredTimeWindow")]
    public string? PreferredTimeWindow { get; set; }

    [BsonElement("assignedUserId")]
    public string? AssignedUserId { get; set; }

    [BsonElement("assignedCollaboratorId")]
    public string? AssignedCollaboratorId { get; set; }

    [BsonElement("responsibleUserId")]
    public string? ResponsibleUserId { get; set; }

    [BsonElement("additionalParticipantUserIds")]
    public List<string> AdditionalParticipantUserIds { get; set; } = [];

    [BsonElement("assignmentResponse")]
    public string AssignmentResponse { get; set; } = "pending";

    [BsonElement("assignmentRespondedAt")]
    public DateTime? AssignmentRespondedAt { get; set; }

    [BsonElement("proposalId")]
    public string? ProposalId { get; set; }

    [BsonElement("checklistSnapshot")]
    public List<FieldTaskChecklistItemDocument> ChecklistSnapshot { get; set; } = [];

    [BsonElement("estimatedCost")]
    public decimal? EstimatedCost { get; set; }

    [BsonElement("estimatedCostCurrency")]
    public string? EstimatedCostCurrency { get; set; } = "EUR";

    [BsonElement("estimatedLabourHours")]
    public decimal? EstimatedLabourHours { get; set; }

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("attachmentIds")]
    public List<string> AttachmentIds { get; set; } = [];

    [BsonElement("relatedHarvestId")]
    public string? RelatedHarvestId { get; set; }

    [BsonElement("weatherEvaluationId")]
    public string? WeatherEvaluationId { get; set; }

    [BsonElement("weatherSuitability")]
    public string WeatherSuitability { get; set; } = "unknown";

    [BsonElement("productLabel")]
    public PlantProtectionProductLabelDocument? ProductLabel { get; set; }

    [BsonElement("latestExecutionId")]
    public string? LatestExecutionId { get; set; }

    [BsonElement("createdByUserId")]
    public string CreatedByUserId { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class TaskExecutionDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("taskId")]
    public string TaskId { get; set; } = string.Empty;

    [BsonElement("fieldId")]
    public string FieldId { get; set; } = string.Empty;

    [BsonElement("resultYear")]
    public int ResultYear { get; set; }

    [BsonElement("startedAt")]
    public DateTime? StartedAt { get; set; }

    [BsonElement("completedAt")]
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("outcome")]
    public string Outcome { get; set; } = "completed";

    [BsonElement("completedByUserIds")]
    public List<string> CompletedByUserIds { get; set; } = [];

    [BsonElement("checklistResults")]
    public List<TaskExecutionChecklistResultDocument> ChecklistResults { get; set; } = [];

    [BsonElement("materials")]
    public List<TaskMaterialDocument> Materials { get; set; } = [];

    [BsonElement("treatedAreaHectares")]
    public double? TreatedAreaHectares { get; set; }

    [BsonElement("quantities")]
    public List<TaskQuantityDocument> Quantities { get; set; } = [];

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("attachmentIds")]
    public List<string> AttachmentIds { get; set; } = [];

    [BsonElement("weatherEvaluationId")]
    public string? WeatherEvaluationId { get; set; }

    [BsonElement("weatherSuitability")]
    public string WeatherSuitability { get; set; } = "unknown";

    [BsonElement("followUpRequired")]
    public bool FollowUpRequired { get; set; }

    [BsonElement("followUpTaskId")]
    public string? FollowUpTaskId { get; set; }

    [BsonElement("recordedByUserId")]
    public string RecordedByUserId { get; set; } = string.Empty;

    [BsonElement("plannedStartSnapshot")]
    public DateTime? PlannedStartSnapshot { get; set; }

    [BsonElement("plannedEndSnapshot")]
    public DateTime? PlannedEndSnapshot { get; set; }

    [BsonElement("undoneAt")]
    public DateTime? UndoneAt { get; set; }

    [BsonElement("undoneByUserId")]
    public string? UndoneByUserId { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class FieldPhenologyObservationDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("fieldId")]
    public string FieldId { get; set; } = string.Empty;

    [BsonElement("stageCode")]
    public string StageCode { get; set; } = "unknown";

    [BsonElement("observedOn")]
    public DateTime ObservedOn { get; set; } = DateTime.UtcNow;

    [BsonElement("source")]
    public string Source { get; set; } = "user";

    [BsonElement("confidence")]
    public string Confidence { get; set; } = "worth_checking";

    [BsonElement("photoIds")]
    public List<string> PhotoIds { get; set; } = [];

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("observedByUserId")]
    public string ObservedByUserId { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class TaskWeatherEvaluationDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("taskId")]
    public string? TaskId { get; set; }

    [BsonElement("proposalId")]
    public string? ProposalId { get; set; }

    [BsonElement("fieldId")]
    public string FieldId { get; set; } = string.Empty;

    [BsonElement("templateCode")]
    public string? TemplateCode { get; set; }

    [BsonElement("candidateDate")]
    public DateTime CandidateDate { get; set; }

    [BsonElement("candidateDurationMinutes")]
    public int? CandidateDurationMinutes { get; set; }

    [BsonElement("suitability")]
    public string Suitability { get; set; } = "unknown";

    [BsonElement("score")]
    public int Score { get; set; }

    [BsonElement("reasons")]
    public List<string> Reasons { get; set; } = [];

    [BsonElement("hardBlockers")]
    public List<string> HardBlockers { get; set; } = [];

    [BsonElement("weatherSnapshotJson")]
    public string? WeatherSnapshotJson { get; set; }

    [BsonElement("evaluatedAt")]
    public DateTime EvaluatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("forecastHorizonHours")]
    public int? ForecastHorizonHours { get; set; }

    [BsonElement("suggestedAlternativeDates")]
    public List<DateTime> SuggestedAlternativeDates { get; set; } = [];

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class OfficialAgriculturalWarningDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("message")]
    public string Message { get; set; } = string.Empty;

    [BsonElement("sourceOrganization")]
    public string? SourceOrganization { get; set; }

    [BsonElement("sourceUrl")]
    public string? SourceUrl { get; set; }

    [BsonElement("sourceReference")]
    public string? SourceReference { get; set; }

    [BsonElement("publishedAt")]
    public DateTime PublishedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("validFrom")]
    public DateTime? ValidFrom { get; set; }

    [BsonElement("validUntil")]
    public DateTime? ValidUntil { get; set; }

    [BsonElement("fieldIds")]
    public List<string> FieldIds { get; set; } = [];

    [BsonElement("regionCodes")]
    public List<string> RegionCodes { get; set; } = [];

    [BsonElement("templateCodes")]
    public List<string> TemplateCodes { get; set; } = [];

    [BsonElement("relevantBbchRange")]
    public BbchRangeDocument? RelevantBbchRange { get; set; }

    [BsonElement("confidence")]
    public string Confidence { get; set; } = "strong_evidence";

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class MonthDayRangeDocument
{
    [BsonElement("startMonth")]
    public int StartMonth { get; set; }

    [BsonElement("startDay")]
    public int StartDay { get; set; } = 1;

    [BsonElement("endMonth")]
    public int EndMonth { get; set; }

    [BsonElement("endDay")]
    public int EndDay { get; set; } = 28;
}

public class BbchRangeDocument
{
    [BsonElement("minCode")]
    public int? MinCode { get; set; }

    [BsonElement("maxCode")]
    public int? MaxCode { get; set; }
}

public class TaskChecklistDefinitionDocument
{
    [BsonElement("key")]
    public string Key { get; set; } = string.Empty;

    [BsonElement("greekLabel")]
    public string GreekLabel { get; set; } = string.Empty;

    [BsonElement("englishLabel")]
    public string EnglishLabel { get; set; } = string.Empty;

    [BsonElement("itemType")]
    public string ItemType { get; set; } = "checkbox";

    [BsonElement("requirement")]
    public string Requirement { get; set; } = "optional";

    [BsonElement("choices")]
    public List<string> Choices { get; set; } = [];

    [BsonElement("unit")]
    public string? Unit { get; set; }

    [BsonElement("isEssential")]
    public bool IsEssential { get; set; } = true;

    [BsonElement("sortOrder")]
    public int SortOrder { get; set; }
}

public class FieldTaskChecklistItemDocument
{
    [BsonElement("key")]
    public string Key { get; set; } = string.Empty;

    [BsonElement("greekLabel")]
    public string GreekLabel { get; set; } = string.Empty;

    [BsonElement("englishLabel")]
    public string EnglishLabel { get; set; } = string.Empty;

    [BsonElement("itemType")]
    public string ItemType { get; set; } = "checkbox";

    [BsonElement("requirement")]
    public string Requirement { get; set; } = "optional";

    [BsonElement("choices")]
    public List<string> Choices { get; set; } = [];

    [BsonElement("unit")]
    public string? Unit { get; set; }

    [BsonElement("isEssential")]
    public bool IsEssential { get; set; } = true;

    [BsonElement("sortOrder")]
    public int SortOrder { get; set; }

    [BsonElement("isAnswered")]
    public bool IsAnswered { get; set; }

    [BsonElement("textValue")]
    public string? TextValue { get; set; }

    [BsonElement("numberValue")]
    public decimal? NumberValue { get; set; }

    [BsonElement("boolValue")]
    public bool? BoolValue { get; set; }

    [BsonElement("attachmentIds")]
    public List<string> AttachmentIds { get; set; } = [];
}

public class TaskExecutionChecklistResultDocument
{
    [BsonElement("key")]
    public string Key { get; set; } = string.Empty;

    [BsonElement("greekLabel")]
    public string GreekLabel { get; set; } = string.Empty;

    [BsonElement("englishLabel")]
    public string EnglishLabel { get; set; } = string.Empty;

    [BsonElement("itemType")]
    public string ItemType { get; set; } = "checkbox";

    [BsonElement("requirement")]
    public string Requirement { get; set; } = "optional";

    [BsonElement("isAnswered")]
    public bool IsAnswered { get; set; }

    [BsonElement("textValue")]
    public string? TextValue { get; set; }

    [BsonElement("numberValue")]
    public decimal? NumberValue { get; set; }

    [BsonElement("boolValue")]
    public bool? BoolValue { get; set; }

    [BsonElement("unit")]
    public string? Unit { get; set; }

    [BsonElement("attachmentIds")]
    public List<string> AttachmentIds { get; set; } = [];
}

public class TaskMaterialDocument
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("quantity")]
    public decimal? Quantity { get; set; }

    [BsonElement("unit")]
    public string? Unit { get; set; }

    [BsonElement("productCode")]
    public string? ProductCode { get; set; }

    [BsonElement("notes")]
    public string? Notes { get; set; }
}

public class TaskQuantityDocument
{
    [BsonElement("key")]
    public string Key { get; set; } = string.Empty;

    [BsonElement("label")]
    public string Label { get; set; } = string.Empty;

    [BsonElement("value")]
    public decimal Value { get; set; }

    [BsonElement("unit")]
    public string Unit { get; set; } = string.Empty;
}

public class PlantProtectionProductLabelDocument
{
    [BsonElement("productName")]
    public string ProductName { get; set; } = string.Empty;

    [BsonElement("productCode")]
    public string? ProductCode { get; set; }

    [BsonElement("rainfastHours")]
    public double? RainfastHours { get; set; }

    [BsonElement("maxWindKmh")]
    public double? MaxWindKmh { get; set; }

    [BsonElement("maxGustKmh")]
    public double? MaxGustKmh { get; set; }

    [BsonElement("minHumidityPercent")]
    public double? MinHumidityPercent { get; set; }

    [BsonElement("maxHumidityPercent")]
    public double? MaxHumidityPercent { get; set; }

    [BsonElement("isApprovedForCropAndTarget")]
    public bool? IsApprovedForCropAndTarget { get; set; }
}

public class FieldWorkProfileDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("fieldId")]
    public string FieldId { get; set; } = string.Empty;

    [BsonElement("resultYearCreated")]
    public int ResultYearCreated { get; set; }

    [BsonElement("profileVersion")]
    public int ProfileVersion { get; set; } = 1;

    [BsonElement("onboardingVersion")]
    public int OnboardingVersion { get; set; } = 1;

    [BsonElement("status")]
    public string Status { get; set; } = "draft";

    [BsonElement("productionPurpose")]
    public string ProductionPurpose { get; set; } = "unknown";

    [BsonElement("irrigation")]
    public IrrigationProfileDocument Irrigation { get; set; } = new();

    [BsonElement("pruning")]
    public PracticeProfileDocument Pruning { get; set; } = new();

    [BsonElement("fertilisation")]
    public FertilisationProfileDocument Fertilisation { get; set; } = new();

    [BsonElement("groundCover")]
    public GroundCoverProfileDocument GroundCover { get; set; } = new();

    [BsonElement("pestManagement")]
    public PestManagementProfileDocument PestManagement { get; set; } = new();

    [BsonElement("analysis")]
    public AnalysisProfileDocument Analysis { get; set; } = new();

    [BsonElement("harvest")]
    public HarvestProfileDocument Harvest { get; set; } = new();

    [BsonElement("defaultAssignments")]
    public DefaultAssignmentsDocument DefaultAssignments { get; set; } = new();

    [BsonElement("notificationPreference")]
    public NotificationPreferenceDocument NotificationPreference { get; set; } = new();

    [BsonElement("currentYearDeclaredWork")]
    public List<CurrentYearDeclaredWorkDocument> CurrentYearDeclaredWork { get; set; } = [];

    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }

    [BsonElement("completedByUserId")]
    public string? CompletedByUserId { get; set; }

    [BsonElement("lastReviewedAt")]
    public DateTime? LastReviewedAt { get; set; }

    [BsonElement("createdByUserId")]
    public string CreatedByUserId { get; set; } = string.Empty;

    [BsonElement("updatedByUserId")]
    public string? UpdatedByUserId { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class PracticeProfileDocument
{
    [BsonElement("preferenceMode")]
    public string PreferenceMode { get; set; } = "unknown";

    [BsonElement("frequencyType")]
    public string FrequencyType { get; set; } = "unknown";

    [BsonElement("frequencyValue")]
    public int? FrequencyValue { get; set; }

    [BsonElement("preferredMonths")]
    public List<int> PreferredMonths { get; set; } = [];

    [BsonElement("lastPerformedYear")]
    public int? LastPerformedYear { get; set; }

    [BsonElement("lastPerformedMonth")]
    public int? LastPerformedMonth { get; set; }

    [BsonElement("datePrecision")]
    public string? DatePrecision { get; set; }

    [BsonElement("defaultAssigneeId")]
    public string? DefaultAssigneeId { get; set; }

    [BsonElement("userNotes")]
    public string? UserNotes { get; set; }

    [BsonElement("source")]
    public string Source { get; set; } = "unknown";

    [BsonElement("confirmedAt")]
    public DateTime? ConfirmedAt { get; set; }
}

public class IrrigationProfileDocument : PracticeProfileDocument
{
    [BsonElement("method")]
    public string Method { get; set; } = "unknown";

    [BsonElement("decisionMaker")]
    public string DecisionMaker { get; set; } = "unknown";
}

public class FertilisationProfileDocument : PracticeProfileDocument
{
    [BsonElement("decisionMaker")]
    public string DecisionMaker { get; set; } = "unknown";
}

public class GroundCoverProfileDocument : PracticeProfileDocument
{
    [BsonElement("methods")]
    public List<string> Methods { get; set; } = [];
}

public class PestManagementProfileDocument : PracticeProfileDocument
{
    [BsonElement("decisionApproach")]
    public string DecisionApproach { get; set; } = "unknown";

    [BsonElement("trapStatus")]
    public string TrapStatus { get; set; } = "unknown";
}

public class AnalysisKindEntryDocument
{
    [BsonElement("kind")]
    public string Kind { get; set; } = "unknown";

    [BsonElement("lastPerformedYear")]
    public int? LastPerformedYear { get; set; }

    [BsonElement("datePrecision")]
    public string? DatePrecision { get; set; }
}

public class AnalysisProfileDocument : PracticeProfileDocument
{
    [BsonElement("kinds")]
    public List<AnalysisKindEntryDocument> Kinds { get; set; } = [];
}

public class HarvestProfileDocument : PracticeProfileDocument
{
    [BsonElement("expectedStartMonth")]
    public int? ExpectedStartMonth { get; set; }

    [BsonElement("organizer")]
    public string Organizer { get; set; } = "unknown";

    [BsonElement("needsMillBooking")]
    public string NeedsMillBooking { get; set; } = "unknown";
}

public class DefaultAssignmentEntryDocument
{
    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    [BsonElement("assigneeUserId")]
    public string? AssigneeUserId { get; set; }

    [BsonElement("isSelf")]
    public bool IsSelf { get; set; }
}

public class DefaultAssignmentsDocument
{
    [BsonElement("entries")]
    public List<DefaultAssignmentEntryDocument> Entries { get; set; } = [];
}

public class NotificationPreferenceDocument
{
    [BsonElement("intensity")]
    public string Intensity { get; set; } = "unknown";

    [BsonElement("acceptedTaskReminderDaysBefore")]
    public int AcceptedTaskReminderDaysBefore { get; set; } = 3;
}

public class ApproximateDateDocument
{
    [BsonElement("year")]
    public int? Year { get; set; }

    [BsonElement("month")]
    public int? Month { get; set; }

    [BsonElement("day")]
    public int? Day { get; set; }

    [BsonElement("precision")]
    public string Precision { get; set; } = "year";
}

public class CurrentYearDeclaredWorkDocument
{
    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    [BsonElement("templateCode")]
    public string? TemplateCode { get; set; }

    [BsonElement("resultYear")]
    public int ResultYear { get; set; }

    [BsonElement("completion")]
    public string Completion { get; set; } = "unknown";

    [BsonElement("approximateDate")]
    public ApproximateDateDocument? ApproximateDate { get; set; }

    [BsonElement("source")]
    public string Source { get; set; } = "user_declared_during_onboarding";
}
