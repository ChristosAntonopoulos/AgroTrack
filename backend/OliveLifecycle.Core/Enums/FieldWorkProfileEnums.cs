namespace OliveLifecycle.Core.Enums;

public enum FieldWorkProfileStatus
{
    Draft,
    Active
}

public static class FieldWorkProfileStatusExtensions
{
    public static string ToApiString(this FieldWorkProfileStatus status) => status switch
    {
        FieldWorkProfileStatus.Active => "active",
        _ => "draft"
    };

    public static FieldWorkProfileStatus? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "draft" => FieldWorkProfileStatus.Draft,
        "active" => FieldWorkProfileStatus.Active,
        _ => null
    };
}

public enum PreferenceMode
{
    Enabled,
    Disabled,
    AskFirst,
    DecidedByProfessional,
    Unknown
}

public static class PreferenceModeExtensions
{
    public static string ToApiString(this PreferenceMode mode) => mode switch
    {
        PreferenceMode.Enabled => "enabled",
        PreferenceMode.Disabled => "disabled",
        PreferenceMode.AskFirst => "ask_first",
        PreferenceMode.DecidedByProfessional => "decided_by_professional",
        _ => "unknown"
    };

    public static PreferenceMode FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "enabled" => PreferenceMode.Enabled,
        "disabled" => PreferenceMode.Disabled,
        "ask_first" => PreferenceMode.AskFirst,
        "decided_by_professional" => PreferenceMode.DecidedByProfessional,
        "unknown" => PreferenceMode.Unknown,
        _ => PreferenceMode.Unknown
    };
}

public enum FrequencyType
{
    TimesPerYear,
    EveryNYears,
    WhenNeeded,
    EvidenceOnly,
    Unknown
}

public static class FrequencyTypeExtensions
{
    public static string ToApiString(this FrequencyType type) => type switch
    {
        FrequencyType.TimesPerYear => "times_per_year",
        FrequencyType.EveryNYears => "every_n_years",
        FrequencyType.WhenNeeded => "when_needed",
        FrequencyType.EvidenceOnly => "evidence_only",
        _ => "unknown"
    };

    public static FrequencyType FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "times_per_year" => FrequencyType.TimesPerYear,
        "every_n_years" => FrequencyType.EveryNYears,
        "when_needed" => FrequencyType.WhenNeeded,
        "evidence_only" => FrequencyType.EvidenceOnly,
        "unknown" => FrequencyType.Unknown,
        _ => FrequencyType.Unknown
    };
}

public enum DatePrecision
{
    Year,
    Month,
    Exact
}

public static class DatePrecisionExtensions
{
    public static string ToApiString(this DatePrecision precision) => precision switch
    {
        DatePrecision.Month => "month",
        DatePrecision.Exact => "exact",
        _ => "year"
    };

    public static DatePrecision? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "year" => DatePrecision.Year,
        "month" => DatePrecision.Month,
        "exact" => DatePrecision.Exact,
        _ => null
    };
}

public enum ProductionPurpose
{
    OliveOil,
    TableOlives,
    Both,
    Unknown
}

public static class ProductionPurposeExtensions
{
    public static string ToApiString(this ProductionPurpose purpose) => purpose switch
    {
        ProductionPurpose.OliveOil => "olive_oil",
        ProductionPurpose.TableOlives => "table_olives",
        ProductionPurpose.Both => "both",
        _ => "unknown"
    };

    public static ProductionPurpose FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "olive_oil" => ProductionPurpose.OliveOil,
        "table_olives" => ProductionPurpose.TableOlives,
        "both" => ProductionPurpose.Both,
        "unknown" => ProductionPurpose.Unknown,
        _ => ProductionPurpose.Unknown
    };
}

public enum PreferenceSource
{
    UserDeclaredDuringOnboarding,
    UserEdited,
    LearnedFromBehaviour,
    ProfessionalProposed,
    SystemDefault,
    Unknown
}

public static class PreferenceSourceExtensions
{
    public static string ToApiString(this PreferenceSource source) => source switch
    {
        PreferenceSource.UserDeclaredDuringOnboarding => "user_declared_during_onboarding",
        PreferenceSource.UserEdited => "user_edited",
        PreferenceSource.LearnedFromBehaviour => "learned_from_behaviour",
        PreferenceSource.ProfessionalProposed => "professional_proposed",
        PreferenceSource.SystemDefault => "system_default",
        _ => "unknown"
    };

    public static PreferenceSource FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "user_declared_during_onboarding" => PreferenceSource.UserDeclaredDuringOnboarding,
        "user_edited" => PreferenceSource.UserEdited,
        "learned_from_behaviour" => PreferenceSource.LearnedFromBehaviour,
        "professional_proposed" => PreferenceSource.ProfessionalProposed,
        "system_default" => PreferenceSource.SystemDefault,
        "unknown" => PreferenceSource.Unknown,
        _ => PreferenceSource.Unknown
    };
}

public enum IrrigationMethod
{
    Drip,
    Sprinklers,
    Portable,
    Other,
    Unknown
}

public static class IrrigationMethodExtensions
{
    public static string ToApiString(this IrrigationMethod method) => method switch
    {
        IrrigationMethod.Drip => "drip",
        IrrigationMethod.Sprinklers => "sprinklers",
        IrrigationMethod.Portable => "portable",
        IrrigationMethod.Other => "other",
        _ => "unknown"
    };

    public static IrrigationMethod FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "drip" => IrrigationMethod.Drip,
        "sprinklers" => IrrigationMethod.Sprinklers,
        "portable" => IrrigationMethod.Portable,
        "other" => IrrigationMethod.Other,
        "unknown" => IrrigationMethod.Unknown,
        _ => IrrigationMethod.Unknown
    };
}

public enum WorkDecisionMaker
{
    Self,
    CollaboratorOrFamily,
    Agronomist,
    AutomaticSystem,
    Contractor,
    NoFixedWay,
    Unknown
}

public static class WorkDecisionMakerExtensions
{
    public static string ToApiString(this WorkDecisionMaker maker) => maker switch
    {
        WorkDecisionMaker.Self => "self",
        WorkDecisionMaker.CollaboratorOrFamily => "collaborator_or_family",
        WorkDecisionMaker.Agronomist => "agronomist",
        WorkDecisionMaker.AutomaticSystem => "automatic_system",
        WorkDecisionMaker.Contractor => "contractor",
        WorkDecisionMaker.NoFixedWay => "no_fixed_way",
        _ => "unknown"
    };

    public static WorkDecisionMaker FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "self" => WorkDecisionMaker.Self,
        "collaborator_or_family" => WorkDecisionMaker.CollaboratorOrFamily,
        "agronomist" => WorkDecisionMaker.Agronomist,
        "automatic_system" => WorkDecisionMaker.AutomaticSystem,
        "contractor" => WorkDecisionMaker.Contractor,
        "no_fixed_way" => WorkDecisionMaker.NoFixedWay,
        "unknown" => WorkDecisionMaker.Unknown,
        _ => WorkDecisionMaker.Unknown
    };
}

public enum GroundCoverMethod
{
    MowerOrMulcher,
    SoilTillage,
    Grazing,
    Herbicide,
    NoFixedClearing,
    Other,
    Unknown
}

public static class GroundCoverMethodExtensions
{
    public static string ToApiString(this GroundCoverMethod method) => method switch
    {
        GroundCoverMethod.MowerOrMulcher => "mower_or_mulcher",
        GroundCoverMethod.SoilTillage => "soil_tillage",
        GroundCoverMethod.Grazing => "grazing",
        GroundCoverMethod.Herbicide => "herbicide",
        GroundCoverMethod.NoFixedClearing => "no_fixed_clearing",
        GroundCoverMethod.Other => "other",
        _ => "unknown"
    };

    public static GroundCoverMethod FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "mower_or_mulcher" => GroundCoverMethod.MowerOrMulcher,
        "soil_tillage" => GroundCoverMethod.SoilTillage,
        "grazing" => GroundCoverMethod.Grazing,
        "herbicide" => GroundCoverMethod.Herbicide,
        "no_fixed_clearing" => GroundCoverMethod.NoFixedClearing,
        "other" => GroundCoverMethod.Other,
        "unknown" => GroundCoverMethod.Unknown,
        _ => GroundCoverMethod.Unknown
    };
}

public enum PestDecisionApproach
{
    OfficialWarnings,
    Agronomist,
    TrapAndFruitChecks,
    Combined,
    NoUsualTreatments,
    Unknown
}

public static class PestDecisionApproachExtensions
{
    public static string ToApiString(this PestDecisionApproach approach) => approach switch
    {
        PestDecisionApproach.OfficialWarnings => "official_warnings",
        PestDecisionApproach.Agronomist => "agronomist",
        PestDecisionApproach.TrapAndFruitChecks => "trap_and_fruit_checks",
        PestDecisionApproach.Combined => "combined",
        PestDecisionApproach.NoUsualTreatments => "no_usual_treatments",
        _ => "unknown"
    };

    public static PestDecisionApproach FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "official_warnings" => PestDecisionApproach.OfficialWarnings,
        "agronomist" => PestDecisionApproach.Agronomist,
        "trap_and_fruit_checks" => PestDecisionApproach.TrapAndFruitChecks,
        "combined" => PestDecisionApproach.Combined,
        "no_usual_treatments" => PestDecisionApproach.NoUsualTreatments,
        "unknown" => PestDecisionApproach.Unknown,
        _ => PestDecisionApproach.Unknown
    };
}

public enum TrapStatus
{
    Active,
    NotYetInstalled,
    None,
    Unknown
}

public static class TrapStatusExtensions
{
    public static string ToApiString(this TrapStatus status) => status switch
    {
        TrapStatus.Active => "active",
        TrapStatus.NotYetInstalled => "not_yet_installed",
        TrapStatus.None => "none",
        _ => "unknown"
    };

    public static TrapStatus FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "active" => TrapStatus.Active,
        "not_yet_installed" => TrapStatus.NotYetInstalled,
        "none" => TrapStatus.None,
        "unknown" => TrapStatus.Unknown,
        _ => TrapStatus.Unknown
    };
}

public enum AnalysisKind
{
    Soil,
    Leaf,
    Water,
    Unknown
}

public static class AnalysisKindExtensions
{
    public static string ToApiString(this AnalysisKind kind) => kind switch
    {
        AnalysisKind.Soil => "soil",
        AnalysisKind.Leaf => "leaf",
        AnalysisKind.Water => "water",
        _ => "unknown"
    };

    public static AnalysisKind FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "soil" => AnalysisKind.Soil,
        "leaf" => AnalysisKind.Leaf,
        "water" => AnalysisKind.Water,
        "unknown" => AnalysisKind.Unknown,
        _ => AnalysisKind.Unknown
    };
}

public enum DeclaredWorkCompletion
{
    Yes,
    No,
    Partially,
    Unknown
}

public static class DeclaredWorkCompletionExtensions
{
    public static string ToApiString(this DeclaredWorkCompletion completion) => completion switch
    {
        DeclaredWorkCompletion.Yes => "yes",
        DeclaredWorkCompletion.No => "no",
        DeclaredWorkCompletion.Partially => "partially",
        _ => "unknown"
    };

    public static DeclaredWorkCompletion FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "yes" => DeclaredWorkCompletion.Yes,
        "no" => DeclaredWorkCompletion.No,
        "partially" => DeclaredWorkCompletion.Partially,
        "unknown" => DeclaredWorkCompletion.Unknown,
        _ => DeclaredWorkCompletion.Unknown
    };
}

public enum NotificationIntensity
{
    DecisionsOnly,
    DecisionsAndUpcoming,
    AllProposals,
    ConfigureLater,
    Unknown
}

public static class NotificationIntensityExtensions
{
    public static string ToApiString(this NotificationIntensity intensity) => intensity switch
    {
        NotificationIntensity.DecisionsOnly => "decisions_only",
        NotificationIntensity.DecisionsAndUpcoming => "decisions_and_upcoming",
        NotificationIntensity.AllProposals => "all_proposals",
        NotificationIntensity.ConfigureLater => "configure_later",
        _ => "unknown"
    };

    public static NotificationIntensity FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "decisions_only" => NotificationIntensity.DecisionsOnly,
        "decisions_and_upcoming" => NotificationIntensity.DecisionsAndUpcoming,
        "all_proposals" => NotificationIntensity.AllProposals,
        "configure_later" => NotificationIntensity.ConfigureLater,
        "unknown" => NotificationIntensity.Unknown,
        _ => NotificationIntensity.Unknown
    };
}

public enum YesNoUnknown
{
    Yes,
    No,
    Unknown
}

public static class YesNoUnknownExtensions
{
    public static string ToApiString(this YesNoUnknown value) => value switch
    {
        YesNoUnknown.Yes => "yes",
        YesNoUnknown.No => "no",
        _ => "unknown"
    };

    public static YesNoUnknown FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "yes" => YesNoUnknown.Yes,
        "no" => YesNoUnknown.No,
        "unknown" => YesNoUnknown.Unknown,
        _ => YesNoUnknown.Unknown
    };
}
