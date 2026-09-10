using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.FieldWork;

/// <summary>
/// Event-triggered proposals (E01–E08). Not annual calendar tasks — only when evidence exists.
/// Configurable planning defaults; never diagnoses or automatic spray instructions.
/// </summary>
public static class FieldWorkEventCatalogue
{
    public const int Version = FieldWorkCatalogue.Version;

    public static IReadOnlyList<FieldWorkCatalogueEntry> All { get; } = BuildAll();

    public static FieldWorkCatalogueEntry? GetByCode(string code) =>
        All.FirstOrDefault(e => string.Equals(e.Code, code, StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyList<FieldWorkCatalogueEntry> BuildAll() =>
    [
        Entry("E01", "Έλεγχος μετά από παγετό", "Frost inspection", "Inspection",
            "Inspect after frost risk when it is safe — not a diagnosis.",
            FieldWorkEventKind.FrostInspection,
            "frost_inspection",
            [
                Check("branches", "Σπασμένα ή κατεστραμμένα κλαδιά", "Broken or damaged branches"),
                Check("trunk", "Ζημιές κορμού", "Trunk damage"),
                Check("fruit", "Ζημιές καρπού/ανθέων", "Fruit or flower damage", essential: false),
                Check("photos", "Φωτογραφίες", "Photos", type: ChecklistItemType.Photo),
                Check("area", "Πληγείσα έκταση", "Affected area", type: ChecklistItemType.Text, essential: false)
            ],
            "Μετά από κίνδυνο παγετού, αξίζει έλεγχος του χωραφιού όταν είναι ασφαλές.",
            "After frost risk, inspect the field when it is safe.",
            "frost_event",
            ProposalConfidence.WorthChecking),

        Entry("E02", "Έλεγχος μετά από καταιγίδα / χαλάζι / ισχυρό άνεμο", "Storm, hail or severe-wind inspection", "Inspection",
            "Inspect after severe weather. Gust threshold is configurable (default 70 km/h).",
            FieldWorkEventKind.StormInspection,
            "storm_inspection",
            [
                Check("branches", "Σπασμένα κλαδιά", "Broken branches"),
                Check("hail", "Ζημιές χαλαζιού", "Hail damage", essential: false),
                Check("erosion", "Διάβρωση ή λιμνάζοντα νερά", "Erosion or standing water"),
                Check("access", "Πρόσβαση", "Access road condition", essential: false),
                Check("photos", "Φωτογραφίες", "Photos", type: ChecklistItemType.Photo)
            ],
            "Υπάρχουν ενδείξεις ισχυρού καιρού — ελέγξτε το χωράφι όταν είναι ασφαλές.",
            "Severe-weather evidence suggests a field inspection when safe.",
            "storm_event",
            ProposalConfidence.WorthChecking),

        Entry("E03", "Έλεγχος θερμικής καταπόνησης", "Heat-stress inspection", "Inspection",
            "Alert defaults for heat (info ~35°C, urgent ~38°C) — not a diagnosis.",
            FieldWorkEventKind.HeatInspection,
            "heat_inspection",
            Weather: "heat_stress",
            Checklist:
            [
                Check("irrigation", "Λειτουργία άρδευσης", "Irrigation operation"),
                Check("soil", "Κατάσταση εδάφους", "Soil condition"),
                Check("leaf", "Συμπτώματα φύλλων", "Leaf symptoms"),
                Check("fruit", "Συμπτώματα καρπών", "Fruit symptoms", essential: false),
                Check("photos", "Φωτογραφίες", "Photos", type: ChecklistItemType.Photo),
                Check("area", "Πληγείσα έκταση", "Affected area", type: ChecklistItemType.Text, essential: false)
            ],
            Greek: "Η πρόγνωση δείχνει υψηλή θερμοκρασία — αξίζει έλεγχος καταπόνησης.",
            English: "Forecast heat suggests a stress inspection is worth considering.",
            Reason: "heat_event",
            Confidence: ProposalConfidence.WorthChecking),

        Entry("E04", "Ανασκόπηση κινδύνου κυκλοκόνιου", "Peacock-spot risk review", "Monitoring",
            "Review risk evidence in spring/autumn wet-cool conditions. Never an automatic spray.",
            FieldWorkEventKind.PeacockSpotRiskReview,
            "peacock_spot_review",
            [
                Check("symptoms", "Έλεγχος φύλλων για συμπτώματα", "Check leaves for symptoms"),
                Check("photos", "Φωτογραφίες", "Photos", type: ChecklistItemType.Photo),
                Check("warning", "Επίσημη προειδοποίηση", "Review official warning if any", essential: false),
                Check("agronomist", "Ερώτηση γεωπόνου", "Ask agronomist", essential: false),
                Check("phi", "Έλεγχος επιλεξιμότητας/PHI αν εξεταστεί επέμβαση", "Review treatment eligibility and PHI if considering action", essential: false)
            ],
            "Υπάρχουν ενδείξεις κινδύνου κυκλοκόνιου — κάντε ανασκόπηση (όχι αυτόματη σύσταση ψεκασμού).",
            "Peacock-spot risk evidence suggests a review — not an automatic spray recommendation.",
            "peacock_spot_risk",
            ProposalConfidence.WorthChecking),

        Entry("E05", "Ανασκόπηση κινδύνου ανθράκνωσης", "Anthracnose risk review", "Monitoring",
            "Review fruit at ripening/pre-harvest under wet autumn conditions. Never auto-spray.",
            FieldWorkEventKind.AnthracnoseRiskReview,
            "anthracnose_review",
            Bbch: new BbchRange { MinCode = 80, MaxCode = 92 },
            Checklist:
            [
                Check("fruit", "Έλεγχος καρπών", "Inspect fruit"),
                Check("photos", "Φωτογραφίες", "Upload photos", type: ChecklistItemType.Photo),
                Check("mummies", "Μουμιοποιημένοι/σαπισμένοι καρποί", "Mummified or rotting fruit", essential: false),
                Check("agronomist", "Ερώτηση γεωπόνου", "Ask agronomist"),
                Check("phi", "Ανασκόπηση PHI / επιλεξιμότητας", "Review PHI and treatment eligibility", essential: false)
            ],
            Greek: "Υπάρχουν ενδείξεις κινδύνου ανθράκνωσης — ελέγξτε καρπούς και συμβουλευτείτε γεωπόνο.",
            English: "Anthracnose risk evidence suggests inspecting fruit and asking an agronomist.",
            Reason: "anthracnose_risk",
            Confidence: ProposalConfidence.WorthChecking),

        Entry("E06", "Ανασκόπηση επέμβασης μετά από βροχή", "Review treatment after rain", "Monitoring",
            "After plant-protection work, unexpected rain within rainfast window. Do not auto-repeat treatment.",
            FieldWorkEventKind.PostTreatmentRainReview,
            "post_treatment_rain_review",
            [
                Check("rain_amount", "Καταγεγραμμένη βροχή", "Recorded rain amount", type: ChecklistItemType.Number),
                Check("timing", "Χρόνος μεταξύ επέμβασης και βροχής", "Time between application and rain", type: ChecklistItemType.Text),
                Check("visible", "Ορατή έκπλυση/ζημιά", "Visible wash-off or damage", essential: false),
                Check("agronomist", "Απόφαση γεωπόνου", "Agronomist decision", type: ChecklistItemType.Text, essential: false),
                Check("no_auto_repeat", "Όχι αυτόματη επανάληψη", "Do not automatically repeat treatment", type: ChecklistItemType.Confirmation)
            ],
            "Βροχή μετά από φυτοπροστασία εντός rainfast — ανασκοπήστε, χωρίς αυτόματη επανάληψη.",
            "Rain after plant protection within the rainfast window — review; do not automatically repeat.",
            "post_treatment_rain",
            ProposalConfidence.StrongEvidence),

        Entry("E07", "Ανασκόπηση λίπανσης μετά από ισχυρή βροχή", "Review fertilisation after heavy rain", "Fertilisation",
            "Surface fertilisation followed by heavy rain. Do not auto-recommend re-application.",
            FieldWorkEventKind.FertiliserHeavyRainReview,
            "fertiliser_rain_review",
            Weather: "surface_fertilisation",
            Checklist:
            [
                Check("rain_amount", "Καταγεγραμμένη βροχή", "Recorded rain amount", type: ChecklistItemType.Number),
                Check("timing", "Χρόνος μετά τη λίπανση", "Time after fertilisation", type: ChecklistItemType.Text),
                Check("field_check", "Οπτικός έλεγχος χωραφιού", "Visual field check"),
                Check("agronomist", "Ερώτηση γεωπόνου", "Ask agronomist", essential: false),
                Check("no_auto_repeat", "Όχι αυτόματη επανάληψη λίπανσης", "Do not automatically re-apply fertiliser", type: ChecklistItemType.Confirmation)
            ],
            Greek: "Ισχυρή βροχή μετά από επιφανειακή λίπανση — ελέγξτε χωρίς αυτόματη επανάληψη.",
            English: "Heavy rain after surface fertilisation — review; do not automatically re-apply.",
            Reason: "fertiliser_heavy_rain",
            Confidence: ProposalConfidence.WorthChecking),

        Entry("E08", "Έλεγχος περιοχής με δορυφορική ανωμαλία", "Satellite anomaly field check", "Inspection",
            "Significant vegetation deviation vs field baseline with sufficient data quality.",
            FieldWorkEventKind.SatelliteAnomalyReview,
            "satellite_anomaly_check",
            [
                Check("map_area", "Έλεγχος περιοχής στο χάρτη", "Check the highlighted map area"),
                Check("irrigation", "Άρδευση / υδατική καταπόνηση", "Irrigation / water stress"),
                Check("pests", "Παράσιτα ή ασθένειες", "Pests or disease", essential: false),
                Check("photos", "Φωτογραφίες", "Photos", type: ChecklistItemType.Photo),
                Check("notes", "Σημειώσεις", "Notes", type: ChecklistItemType.Text, essential: false)
            ],
            "Ελέγξτε αυτή την περιοχή του χωραφιού — η δορυφορική ένδειξη δείχνει απόκλιση, όχι διάγνωση.",
            "Check this area of the field — satellite change is evidence to inspect, not a diagnosis.",
            "satellite_anomaly",
            ProposalConfidence.WorthChecking)
    ];

    private static FieldWorkCatalogueEntry Entry(
        string code,
        string greekName,
        string englishName,
        string category,
        string description,
        FieldWorkEventKind eventKind,
        string completionSchema,
        List<TaskChecklistDefinition> Checklist,
        string Greek,
        string English,
        string Reason,
        ProposalConfidence Confidence,
        string? Weather = null,
        BbchRange? Bbch = null)
    {
        var rules = new List<CatalogueRule>
        {
            new()
            {
                RuleCode = $"{code}_EVENT",
                GreekExplanation = Greek,
                EnglishExplanation = English,
                SourceType = ProposalSourceType.WeatherRule,
                DefaultConfidence = Confidence,
                ReasonCodes = [Reason],
                RequiredEventKind = eventKind,
                AllowUnknownPhenology = true,
                RequiredBbchRange = Bbch
            }
        };

        return new FieldWorkCatalogueEntry
        {
            Code = code,
            GreekName = greekName,
            EnglishName = englishName,
            Category = category,
            Description = description,
            CandidateBbchRange = Bbch,
            DefaultDuration = TimeSpan.FromHours(2),
            WeatherRuleProfile = Weather,
            CompletionSchema = completionSchema,
            DefaultChecklist = Checklist,
            Rules = rules,
            IsPlantProtectionTreatment = false
        };
    }

    private static int _checkOrder;

    private static TaskChecklistDefinition Check(
        string key,
        string greek,
        string english,
        ChecklistItemType type = ChecklistItemType.Checkbox,
        ChecklistItemRequirement requirement = ChecklistItemRequirement.RequiredBeforeCompletion,
        bool essential = true) => new()
    {
        Key = key,
        GreekLabel = greek,
        EnglishLabel = english,
        ItemType = type,
        Requirement = requirement,
        IsEssential = essential,
        SortOrder = ++_checkOrder
    };
}
