using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core;

/// <summary>
/// Human-readable Field Work labels. The UI must never show raw enum or API values.
/// </summary>
public static class FieldWorkDisplayLabels
{
    public const string UnknownPhenologyEl = "Δεν γνωρίζουμε ακόμη το στάδιο του ελαιώνα.";
    public const string UnknownPhenologyEn = "We do not yet know the grove stage.";
    public const string RecordStageEl = "Καταγραφή σταδίου";
    public const string RecordStageEn = "Record stage";
    public const string MoreChecksEl = "Περισσότεροι έλεγχοι";
    public const string MoreChecksEn = "More checks";

    public static string ForTaskStatus(Enums.FieldTaskStatus status, string language = "el") => status switch
    {
        Enums.FieldTaskStatus.Ready => IsEnglish(language) ? "Ready" : "Έτοιμη",
        Enums.FieldTaskStatus.InProgress => IsEnglish(language) ? "In progress" : "Σε εξέλιξη",
        Enums.FieldTaskStatus.Blocked => IsEnglish(language) ? "Blocked" : "Δεν μπορεί να γίνει",
        Enums.FieldTaskStatus.Completed => IsEnglish(language) ? "Completed" : "Ολοκληρώθηκε",
        Enums.FieldTaskStatus.Cancelled => IsEnglish(language) ? "Cancelled" : "Ακυρώθηκε",
        _ => IsEnglish(language) ? "Planned" : "Προγραμματισμένη"
    };

    /// <summary>Visual status for proposals shown alongside tasks.</summary>
    public static string ProposedStatus(string language = "el") =>
        IsEnglish(language) ? "Proposed" : "Πρόταση";

    public static string ForProposalDecision(TaskProposalDecision decision, string language = "el") => decision switch
    {
        TaskProposalDecision.RemindLater => IsEnglish(language) ? "Remind me later" : "Θύμισέ μου αργότερα",
        TaskProposalDecision.NotForThisField => IsEnglish(language) ? "Not for this field" : "Δεν αφορά αυτό το χωράφι",
        TaskProposalDecision.DismissForYear => IsEnglish(language) ? "Not this year" : "Όχι φέτος",
        _ => IsEnglish(language) ? "Schedule it" : "Προγραμμάτισέ την"
    };

    public static string ForProposalSource(ProposalSourceType source, string language = "el") => source switch
    {
        ProposalSourceType.FieldObservation => IsEnglish(language) ? "Field observation" : "Παρατήρηση χωραφιού",
        ProposalSourceType.WeatherRule => IsEnglish(language) ? "Weather rule" : "Κανόνας καιρού",
        ProposalSourceType.OfficialWarning => IsEnglish(language) ? "Official warning" : "Επίσημη προειδοποίηση",
        ProposalSourceType.Agronomist => IsEnglish(language) ? "Agronomist" : "Γεωπόνος",
        ProposalSourceType.UserCreated => IsEnglish(language) ? "User-created" : "Δημιουργήθηκε από εσένα",
        ProposalSourceType.PreviousYearPattern => IsEnglish(language) ? "Previous-year pattern" : "Μοτίβο προηγούμενης χρονιάς",
        _ => IsEnglish(language) ? "Seasonal baseline" : "Εποχική βάση"
    };

    public static string ForConfidence(Enums.ProposalConfidence confidence, string language = "el") => confidence switch
    {
        Enums.ProposalConfidence.StrongEvidence => IsEnglish(language) ? "Strong evidence" : "Ισχυρή ένδειξη",
        Enums.ProposalConfidence.WorthChecking => IsEnglish(language) ? "Worth checking" : "Χρειάζεται έλεγχο",
        _ => IsEnglish(language) ? "Seasonal reminder" : "Εποχική υπενθύμιση"
    };

    public static string ForBbchStage(OliveBbchStage stage, string language = "el") => stage switch
    {
        OliveBbchStage.BudDevelopment => IsEnglish(language) ? "Bud development" : "Ανάπτυξη οφθαλμών",
        OliveBbchStage.LeafDevelopment => IsEnglish(language) ? "Leaf development" : "Ανάπτυξη φύλλων",
        OliveBbchStage.ShootDevelopment => IsEnglish(language) ? "Shoot development" : "Ανάπτυξη βλαστών",
        OliveBbchStage.InflorescenceDevelopment => IsEnglish(language) ? "Inflorescence development" : "Ανάπτυξη ανθοταξίας",
        OliveBbchStage.Flowering => IsEnglish(language) ? "Flowering" : "Άνθιση",
        OliveBbchStage.FruitDevelopment => IsEnglish(language) ? "Fruit development" : "Ανάπτυξη καρπού",
        OliveBbchStage.Ripening => IsEnglish(language) ? "Ripening" : "Ωρίμανση",
        OliveBbchStage.OverripeFruitFall => IsEnglish(language) ? "Overripe / fruit fall" : "Υπερώριμο / πτώση καρπού",
        _ => IsEnglish(language) ? "Unknown" : "Άγνωστο"
    };

    public static string ForWeatherSuitability(Enums.WeatherSuitability suitability, string language = "el") => suitability switch
    {
        Enums.WeatherSuitability.Good => IsEnglish(language) ? "Good day" : "Καλή ημέρα",
        Enums.WeatherSuitability.Caution => IsEnglish(language) ? "Needs caution" : "Θέλει προσοχή",
        Enums.WeatherSuitability.Unsuitable => IsEnglish(language) ? "Unsuitable day" : "Ακατάλληλη ημέρα",
        _ => IsEnglish(language) ? "Not enough data" : "Δεν υπάρχουν αρκετά δεδομένα"
    };

    public static string MissingProductLabel(string language = "el") =>
        IsEnglish(language)
            ? "Product label details are required before plant-protection weather can be ranked."
            : "Χρειάζονται τα στοιχεία της ετικέτας για να αξιολογηθούν οι συνθήκες φυτοπροστασίας.";

    public static string ForExecutionOutcome(TaskExecutionOutcome outcome, string language = "el") => outcome switch
    {
        TaskExecutionOutcome.PartiallyCompleted => IsEnglish(language) ? "Partially completed" : "Έγινε ένα μέρος",
        TaskExecutionOutcome.NotDone => IsEnglish(language) ? "Not done" : "Δεν έγινε",
        _ => IsEnglish(language) ? "Completed" : "Ολοκληρώθηκε"
    };

    public static string UnknownPhenology(string language = "el") =>
        IsEnglish(language) ? UnknownPhenologyEn : UnknownPhenologyEl;

    public static string RecordStage(string language = "el") =>
        IsEnglish(language) ? RecordStageEn : RecordStageEl;

    public static string ForProfileStatus(FieldWorkProfileStatus status, string language = "el") => status switch
    {
        FieldWorkProfileStatus.Active => IsEnglish(language) ? "Active" : "Ενεργό",
        _ => IsEnglish(language) ? "Draft" : "Πρόχειρο"
    };

    public static string ForPreferenceMode(PreferenceMode mode, string language = "el") => mode switch
    {
        PreferenceMode.Enabled => IsEnglish(language) ? "Enabled" : "Ενεργό",
        PreferenceMode.Disabled => IsEnglish(language) ? "Disabled" : "Απενεργοποιημένο",
        PreferenceMode.AskFirst => IsEnglish(language) ? "Ask first" : "Ρώτα πρώτα",
        PreferenceMode.DecidedByProfessional => IsEnglish(language) ? "Decided by a professional" : "Το αποφασίζει επαγγελματίας",
        _ => IsEnglish(language) ? "Unknown" : "Άγνωστο"
    };

    public static string ForFrequencyType(FrequencyType type, string language = "el") => type switch
    {
        FrequencyType.TimesPerYear => IsEnglish(language) ? "Times per year" : "Φορές τον χρόνο",
        FrequencyType.EveryNYears => IsEnglish(language) ? "Every N years" : "Κάθε N χρόνια",
        FrequencyType.WhenNeeded => IsEnglish(language) ? "When needed" : "Όταν χρειάζεται",
        FrequencyType.EvidenceOnly => IsEnglish(language) ? "Only with evidence" : "Μόνο με ένδειξη",
        _ => IsEnglish(language) ? "Unknown" : "Άγνωστο"
    };

    public static string ForProductionPurpose(ProductionPurpose purpose, string language = "el") => purpose switch
    {
        ProductionPurpose.OliveOil => IsEnglish(language) ? "Olive oil" : "Ελαιόλαδο",
        ProductionPurpose.TableOlives => IsEnglish(language) ? "Table olives" : "Επιτραπέζια ελιά",
        ProductionPurpose.Both => IsEnglish(language) ? "Both" : "Και τα δύο",
        _ => IsEnglish(language) ? "Unknown" : "Άγνωστο"
    };

    public static string ForDatePrecision(DatePrecision precision, string language = "el") => precision switch
    {
        DatePrecision.Month => IsEnglish(language) ? "Month" : "Μήνας",
        DatePrecision.Exact => IsEnglish(language) ? "Exact date" : "Ακριβής ημερομηνία",
        _ => IsEnglish(language) ? "Year" : "Έτος"
    };

    public static string ForNotificationIntensity(NotificationIntensity intensity, string language = "el") => intensity switch
    {
        NotificationIntensity.DecisionsOnly => IsEnglish(language) ? "Only when a decision is needed" : "Μόνο όταν χρειάζεται απόφαση",
        NotificationIntensity.DecisionsAndUpcoming => IsEnglish(language) ? "Decisions and upcoming work" : "Για αποφάσεις και εργασίες που πλησιάζουν",
        NotificationIntensity.AllProposals => IsEnglish(language) ? "All proposals" : "Για όλες τις προτάσεις",
        NotificationIntensity.ConfigureLater => IsEnglish(language) ? "I will set this later" : "Θα το ρυθμίσω αργότερα",
        _ => IsEnglish(language) ? "Unknown" : "Άγνωστο"
    };

    public static string ForTemplateEligibility(TemplateEligibilityStatus status, string language = "el") => status switch
    {
        TemplateEligibilityStatus.Suppressed => IsEnglish(language) ? "Not proposed" : "Δεν προτείνεται",
        TemplateEligibilityStatus.AskFirst => IsEnglish(language) ? "Ask first" : "Ρώτα πρώτα",
        _ => IsEnglish(language) ? "Proposed" : "Προτείνεται"
    };

    private static bool IsEnglish(string language) =>
        language.StartsWith("en", StringComparison.OrdinalIgnoreCase);
}
