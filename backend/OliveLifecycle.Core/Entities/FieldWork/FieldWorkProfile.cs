using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities.FieldWork;

/// <summary>
/// Field-specific work personalisation. Onboarding must not create scheduled FieldTasks.
/// Draft profiles and draft fields must not drive proposals (Phase 2+).
/// </summary>
public class FieldWorkProfile : BaseEntity
{
    public const int CurrentOnboardingVersion = 1;

    public string FieldId { get; set; } = string.Empty;
    public int ResultYearCreated { get; set; }
    public int ProfileVersion { get; set; } = 1;
    public int OnboardingVersion { get; set; } = CurrentOnboardingVersion;
    public FieldWorkProfileStatus Status { get; set; } = FieldWorkProfileStatus.Draft;

    public ProductionPurpose ProductionPurpose { get; set; } = ProductionPurpose.Unknown;

    public IrrigationProfile Irrigation { get; set; } = new();
    public PruningProfile Pruning { get; set; } = new();
    public FertilisationProfile Fertilisation { get; set; } = new();
    public GroundCoverProfile GroundCover { get; set; } = new();
    public PestManagementProfile PestManagement { get; set; } = new();
    public AnalysisProfile Analysis { get; set; } = new();
    public HarvestProfile Harvest { get; set; } = new();

    public DefaultAssignments DefaultAssignments { get; set; } = new();
    public NotificationPreference NotificationPreference { get; set; } = new();
    public List<CurrentYearDeclaredWorkItem> CurrentYearDeclaredWork { get; set; } = [];

    public DateTime? CompletedAt { get; set; }
    public string? CompletedByUserId { get; set; }
    public DateTime? LastReviewedAt { get; set; }

    public string CreatedByUserId { get; set; } = string.Empty;
    public string? UpdatedByUserId { get; set; }
}

/// <summary>Approximate historical date with explicit precision. Never invent Exact from Year/Month.</summary>
public class ApproximateDate
{
    public int? Year { get; set; }
    public int? Month { get; set; }
    public int? Day { get; set; }
    public DatePrecision Precision { get; set; } = DatePrecision.Year;
}

/// <summary>Shared practice preference shape for typed subdocuments.</summary>
public abstract class PracticeProfileBase
{
    public PreferenceMode PreferenceMode { get; set; } = PreferenceMode.Unknown;
    public FrequencyType FrequencyType { get; set; } = FrequencyType.Unknown;
    public int? FrequencyValue { get; set; }
    public List<int> PreferredMonths { get; set; } = [];
    public int? LastPerformedYear { get; set; }
    public int? LastPerformedMonth { get; set; }
    public DatePrecision? DatePrecision { get; set; }
    public string? DefaultAssigneeId { get; set; }
    public string? UserNotes { get; set; }
    public PreferenceSource Source { get; set; } = PreferenceSource.Unknown;
    public DateTime? ConfirmedAt { get; set; }
}

public class IrrigationProfile : PracticeProfileBase
{
    public IrrigationMethod Method { get; set; } = IrrigationMethod.Unknown;
    public WorkDecisionMaker DecisionMaker { get; set; } = WorkDecisionMaker.Unknown;
}

public class PruningProfile : PracticeProfileBase
{
}

public class FertilisationProfile : PracticeProfileBase
{
    public WorkDecisionMaker DecisionMaker { get; set; } = WorkDecisionMaker.Unknown;
}

public class GroundCoverProfile : PracticeProfileBase
{
    public List<GroundCoverMethod> Methods { get; set; } = [];
}

public class PestManagementProfile : PracticeProfileBase
{
    public PestDecisionApproach DecisionApproach { get; set; } = PestDecisionApproach.Unknown;
    public TrapStatus TrapStatus { get; set; } = TrapStatus.Unknown;
}

public class AnalysisKindEntry
{
    public AnalysisKind Kind { get; set; } = AnalysisKind.Unknown;
    public int? LastPerformedYear { get; set; }
    public DatePrecision? DatePrecision { get; set; } = Enums.DatePrecision.Year;
}

public class AnalysisProfile : PracticeProfileBase
{
    public List<AnalysisKindEntry> Kinds { get; set; } = [];
}

public class HarvestProfile : PracticeProfileBase
{
    public int? ExpectedStartMonth { get; set; }
    public WorkDecisionMaker Organizer { get; set; } = WorkDecisionMaker.Unknown;
    public YesNoUnknown NeedsMillBooking { get; set; } = YesNoUnknown.Unknown;
}

public class DefaultAssignmentEntry
{
    public string Category { get; set; } = string.Empty;
    public string? AssigneeUserId { get; set; }
    public bool IsSelf { get; set; }
}

public class DefaultAssignments
{
    public List<DefaultAssignmentEntry> Entries { get; set; } = [];
}

public class NotificationPreference
{
    public NotificationIntensity Intensity { get; set; } = NotificationIntensity.Unknown;
    public int AcceptedTaskReminderDaysBefore { get; set; } = 3;
}

public class CurrentYearDeclaredWorkItem
{
    public string Category { get; set; } = string.Empty;
    public string? TemplateCode { get; set; }
    public int ResultYear { get; set; }
    public DeclaredWorkCompletion Completion { get; set; } = DeclaredWorkCompletion.Unknown;
    public ApproximateDate? ApproximateDate { get; set; }
    public PreferenceSource Source { get; set; } = PreferenceSource.UserDeclaredDuringOnboarding;
}
