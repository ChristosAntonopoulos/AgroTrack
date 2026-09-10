using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.FieldWork;

/// <summary>Catalogue entry for one annual template (T01–T24) plus its proposal rules.</summary>
public sealed class FieldWorkCatalogueEntry
{
    public required string Code { get; init; }
    public required string GreekName { get; init; }
    public required string EnglishName { get; init; }
    public required string Category { get; init; }
    public string? Description { get; init; }
    public MonthDayRange? CandidateMonthRange { get; init; }
    public BbchRange? CandidateBbchRange { get; init; }
    public TimeSpan? DefaultDuration { get; init; }
    public List<string> RequiredFieldCapabilities { get; init; } = [];
    public string? WeatherRuleProfile { get; init; }
    public string? CompletionSchema { get; init; }
    public string? FinancialCategorySuggestion { get; init; }
    public List<TaskChecklistDefinition> DefaultChecklist { get; init; } = [];
    public List<CatalogueRule> Rules { get; init; } = [];

    /// <summary>
    /// Plant-protection treatment proposals must not come from month alone;
    /// require official warning or agronomist. Monitoring templates stay false.
    /// </summary>
    public bool IsPlantProtectionTreatment { get; init; }

    /// <summary>When true, only irrigated fields receive seasonal proposals.</summary>
    public bool RequiresIrrigatedField { get; init; }
}

public sealed class CatalogueRule
{
    public required string RuleCode { get; init; }
    public required string GreekExplanation { get; init; }
    public string? EnglishExplanation { get; init; }
    public ProposalSourceType SourceType { get; init; } = ProposalSourceType.SeasonalBaseline;
    public ProposalConfidence DefaultConfidence { get; init; } = ProposalConfidence.SeasonalReminder;
    public List<string> ReasonCodes { get; init; } = [];
    public BbchRange? RequiredBbchRange { get; init; }
    public MonthDayRange? CandidateMonthRange { get; init; }
    public bool RequiresOfficialWarning { get; init; }
    public bool RequiresAgronomist { get; init; }
    public bool AllowUnknownPhenology { get; init; }
    public bool RequiresIrrigatedField { get; init; }

    /// <summary>When set, this rule fires only if the matching event signal is active.</summary>
    public FieldWorkEventKind? RequiredEventKind { get; init; }
}

/// <summary>Greece-oriented initial yearly template catalogue T01–T24.</summary>
public static class FieldWorkCatalogue
{
    public const int Version = 1;

    public static IReadOnlyList<FieldWorkCatalogueEntry> All { get; } = BuildAll();

    public static FieldWorkCatalogueEntry? GetByCode(string code) =>
        All.FirstOrDefault(e => string.Equals(e.Code, code, StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyList<FieldWorkCatalogueEntry> BuildAll() =>
    [
        Entry("T01", "Ανασκόπηση προηγούμενης χρονιάς", "Review previous year", "Year review",
            "Review harvest, costs, unfinished work and pick one improvement.",
            Month(1, 1, 1, 31), null, "year_review", null,
            [
                Check("review_harvest", "Έλεγχος ποσότητας συγκομιδής", "Review harvest quantity"),
                Check("review_oil", "Έλεγχος ποσότητας και απόδοσης λαδιού", "Review oil quantity and yield"),
                Check("review_money", "Έλεγχος εσόδων και εξόδων", "Review income and expenses"),
                Check("review_open_tasks", "Έλεγχος ημιτελών εργασιών", "Review unfinished tasks"),
                Check("main_problem", "Καταγραφή κύριου προβλήματος", "Record main problem of the year"),
                Check("improvement", "Επιλογή μιας βελτίωσης", "Select one improvement for the new year", essential: false)
            ],
            [
                Seasonal("T01_SEASONAL", "Ήρθε η περίοδος ανασκόπησης της προηγούμενης χρονιάς.",
                    "It is time to review the previous result year.", "previous_year_review")
            ]),

        Entry("T02", "Χειμερινός έλεγχος χωραφιού", "Winter field inspection", "Inspection",
            "Inspect after winter weather before pruning.",
            Month(1, 15, 2, 28), null, "inspection_complete", null, Weather: "winter_inspection",
            Checklist:
            [
                Check("broken_branches", "Σπασμένα κλαδιά", "Broken branches"),
                Check("standing_water", "Λιμνάζοντα νερά ή κακή αποστράγγιση", "Standing water or poor drainage"),
                Check("erosion", "Διάβρωση εδάφους", "Soil erosion"),
                Check("trunk_damage", "Ζημιές στον κορμό", "Trunk damage"),
                Check("disease", "Συμπτώματα ασθενειών", "Disease symptoms"),
                Check("irrigation_damage", "Ζημιές άρδευσης", "Irrigation damage", essential: false),
                Check("access_road", "Κατάσταση πρόσβασης", "Access-road condition", essential: false),
                Check("photos", "Φωτογραφίες", "Photos", type: ChecklistItemType.Photo, essential: false)
            ],
            Rules:
            [
                Seasonal("T02_SEASONAL", "Είναι καλή περίοδος για χειμερινό έλεγχο του χωραφιού.",
                    "It is a good period for a winter field inspection.", "winter_inspection")
            ]),

        Entry("T03", "Ανάλυση εδάφους", "Soil analysis", "Soil & Analysis",
            "Sample soil every ~3 years or after major soil problems.",
            Month(1, 15, 3, 31), null, "lab_results", "fertilizers",
            [
                Check("zones", "Επιβεβαίωση ζωνών δειγματοληψίας", "Confirm sampling zones"),
                Check("avoid_abnormal", "Αποφυγή μη αντιπροσωπευτικών σημείων", "Avoid visibly abnormal areas unless sampled separately"),
                Check("depth", "Καταγραφή βάθους δείγματος", "Record sample depth", type: ChecklistItemType.Number),
                Check("subsamples", "Αριθμός υποδειγμάτων", "Record number of subsamples", type: ChecklistItemType.Number),
                Check("lab", "Εργαστήριο", "Record laboratory", type: ChecklistItemType.Text),
                Check("label_photos", "Φωτογραφία ετικετών", "Photograph sample labels", type: ChecklistItemType.Photo, essential: false),
                Check("upload", "Ανέβασμα αποτελεσμάτων", "Upload results", type: ChecklistItemType.Document)
            ],
            [
                Seasonal("T03_SEASONAL", "Είναι η περίοδος για ανάλυση εδάφους, αν δεν υπάρχει έγκυρη πρόσφατη.",
                    "Soil analysis is normally done now if no valid recent analysis exists.", "soil_analysis_due",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T04", "Ετήσιο σχέδιο λίπανσης", "Annual fertilisation plan", "Fertilisation",
            "Plan nutrition from analyses and field history — do not fertilise blindly.",
            Month(2, 1, 3, 31), null, "fertilisation_plan", "fertilizers",
            [
                Check("leaf_analysis", "Τελευταία φυλλοδιαγνωστική", "Latest leaf analysis, when available", essential: false),
                Check("soil_analysis", "Τελευταία ανάλυση εδάφους", "Latest soil analysis"),
                Check("harvest_load", "Προηγούμενη συγκομιδή", "Previous harvest load", essential: false),
                Check("agronomist", "Έγκριση γεωπόνου", "Agronomist approval", type: ChecklistItemType.Confirmation, essential: false),
                Check("plan_cost", "Εκτιμώμενο κόστος", "Estimated cost", type: ChecklistItemType.Number, essential: false)
            ],
            [
                Seasonal("T04_SEASONAL", "Χρειάζεται ετήσιο σχέδιο λίπανσης για τη χρονιά αποτελέσματος.",
                    "An annual fertilisation plan is needed for this result year.", "fertilisation_plan_missing",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T05", "Βασική / εδαφική λίπανση", "Base or soil fertilisation application", "Fertilisation",
            "Apply only when an approved plan exists and conditions suit.",
            Month(2, 15, 4, 30), Bbch(0, 59), "fertilisation_application", "fertilizers", Weather: "surface_fertilisation",
            Checklist:
            [
                Check("correct_field", "Σωστό χωράφι", "Correct field", type: ChecklistItemType.Confirmation),
                Check("correct_product", "Σωστό λίπασμα", "Correct fertiliser", type: ChecklistItemType.Confirmation),
                Check("planned_qty", "Προγραμματισμένη ποσότητα", "Planned quantity", type: ChecklistItemType.QuantityWithUnit),
                Check("equipment", "Έλεγχος εξοπλισμού", "Equipment checked"),
                Check("actual_qty", "Πραγματική ποσότητα", "Actual quantity recorded", type: ChecklistItemType.QuantityWithUnit),
                Check("expense", "Απόδειξη ή έξοδο", "Receipt or expense added", essential: false),
                Check("photo", "Φωτογραφία", "Photo optional", type: ChecklistItemType.Photo, essential: false)
            ],
            Rules:
            [
                Seasonal("T05_SEASONAL", "Υπάρχει παράθυρο για βασική λίπανση αν υπάρχει εγκεκριμένο σχέδιο.",
                    "Base fertilisation may be due if an approved plan exists.", "base_fertilisation_window",
                    confidence: ProposalConfidence.WorthChecking, allowUnknownPhenology: true)
            ]),

        Entry("T06", "Κλάδεμα", "Pruning", "Canopy",
            "Prune after frost risk and before advanced flowering. Do not recommend severe pruning automatically.",
            Month(2, 15, 4, 15), Bbch(0, 54), "pruning_complete", "labor", Weather: "pruning",
            Checklist:
            [
                Check("objective", "Στόχος κλαδέματος", "Confirm pruning objective", type: ChecklistItemType.Choice),
                Check("damaged", "Σήμανση κατεστραμμένων/άρρωστων κλαδιών", "Mark damaged/diseased branches"),
                Check("tools", "Απολύμανση εργαλείων όπου χρειάζεται", "Disinfect tools where required", essential: false),
                Check("area", "Δέντρα ή έκταση που ολοκληρώθηκε", "Record trees or area completed", type: ChecklistItemType.Text),
                Check("photos", "Φωτογραφίες πριν/μετά", "Photograph before and after", type: ChecklistItemType.Photo, essential: false),
                Check("labour", "Καταγραφή εργασίας", "Record labour", type: ChecklistItemType.Number, essential: false),
                Check("residue_plan", "Σχέδιο υπολειμμάτων", "Record branch-residue plan", essential: false)
            ],
            Rules:
            [
                Seasonal("T06_SEASONAL", "Είναι η περίοδος κλαδέματος, πριν την προχωρημένη άνθιση.",
                    "Pruning season is open, preferably before advanced flowering.", "pruning_window",
                    allowUnknownPhenology: false)
            ]),

        Entry("T07", "Διαχείριση υπολειμμάτων κλαδέματος", "Manage pruning residues", "Canopy",
            "Handle residues within about 7 days after pruning.",
            Month(2, 15, 4, 30), null, "residue_method", "labor",
            [
                Check("diseased", "Επιβεβαίωση ότι δεν κρατούνται λάθος άρρωστα υλικά", "Confirm no diseased material is retained incorrectly"),
                Check("method", "Μέθοδος", "Record method", type: ChecklistItemType.Choice),
                Check("area", "Έκταση", "Record area", type: ChecklistItemType.Text),
                Check("expense", "Έξοδο εργασίας/καυσίμου", "Add labour/fuel expense", essential: false),
                Check("photo", "Φωτογραφία", "Add photo", type: ChecklistItemType.Photo, essential: false)
            ],
            [
                Seasonal("T07_FOLLOWUP", "Μετά το κλάδεμα χρειάζεται καταγραφή διαχείρισης υπολειμμάτων.",
                    "After pruning, residue handling should be recorded.", "pruning_residue_due",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T08", "Έλεγχος αρδευτικού συστήματος", "Irrigation-system inspection", "Irrigation",
            "Inspect before the first expected irrigation.",
            Month(3, 15, 4, 30), null, "irrigation_inspection", "irrigation",
            [
                Check("pump", "Λειτουργία αντλίας", "Pump operation"),
                Check("filters", "Φίλτρα", "Filters"),
                Check("pipes", "Κύριοι σωλήνες", "Main pipes"),
                Check("emitters", "Σταλάκτες", "Emitters"),
                Check("leaks", "Διαρροές", "Leaks"),
                Check("pressure", "Πίεση", "Pressure", essential: false),
                Check("meter", "Υδρόμετρο", "Water meter", essential: false),
                Check("repairs", "Ανάγκες επισκευής", "Record repair needs", type: ChecklistItemType.Text, essential: false)
            ],
            [
                Seasonal("T08_SEASONAL", "Πριν την πρώτη άρδευση, ελέγξτε το αρδευτικό σύστημα.",
                    "Inspect the irrigation system before the first expected irrigation.", "irrigation_system_check",
                    requiresIrrigated: true)
            ],
            requiresIrrigated: true),

        Entry("T09", "Διαχείριση ζιζανίων / κάλυψης εδάφους", "Ground-cover and fire-risk management", "Ground cover",
            "Manage vegetation for access and fire risk. Do not assume herbicide use.",
            Month(4, 1, 6, 15), null, "ground_cover", "fuel_and_energy", Weather: "ground_cover",
            Checklist:
            [
                Check("area", "Έκταση", "Area", type: ChecklistItemType.Text),
                Check("method", "Μέθοδος", "Method", type: ChecklistItemType.Choice),
                Check("hours", "Ώρες", "Hours", type: ChecklistItemType.Number, essential: false),
                Check("fuel", "Κόστος καυσίμου", "Fuel cost", type: ChecklistItemType.Number, essential: false),
                Check("photos", "Φωτογραφίες πριν/μετά", "Before/after photos", type: ChecklistItemType.Photo, essential: false)
            ],
            Rules:
            [
                Seasonal("T09_SEASONAL", "Είναι καλή περίοδος για διαχείριση κάλυψης εδάφους και κινδύνου φωτιάς.",
                    "Ground-cover and fire-risk management is normally done in this period.", "ground_cover_window")
            ]),

        Entry("T10", "Παρατήρηση άνθισης", "Flowering-stage observation", "Phenology",
            "Confirm flowering stage; unlocks or suppresses later proposals.",
            Month(4, 1, 5, 31), Bbch(50, 69), "phenology_flowering", null,
            [
                Check("photos", "Φωτογραφία αντιπροσωπευτικών δέντρων", "Photograph representative trees", type: ChecklistItemType.Photo),
                Check("stage", "Επιλογή σταδίου", "Select stage", type: ChecklistItemType.Choice),
                Check("flowering_level", "Άνθιση: Κακή / Μέτρια / Ισχυρή", "Flowering: Poor, Medium or Strong", type: ChecklistItemType.Choice),
                Check("pests", "Ορατά παράσιτα/συμπτώματα", "Record visible pests/symptoms", essential: false),
                Check("drop", "Ασυνήθιστη πτώση ανθέων", "Record unusual flower drop", essential: false)
            ],
            [
                Seasonal("T10_SEASONAL", "Αναμένεται άνθιση — επιβεβαιώστε το στάδιο με παρατήρηση.",
                    "Flowering is expected — confirm the stage with an observation.", "flowering_unconfirmed",
                    confidence: ProposalConfidence.WorthChecking, allowUnknownPhenology: true)
            ]),

        Entry("T11", "Παρακολούθηση πυρηνοτρήτη", "Olive-moth monitoring", "Monitoring",
            "Monitor in flowering to early fruit set. Treatment is never proposed from month alone.",
            Month(4, 1, 6, 30), Bbch(50, 75), "moth_monitoring", null,
            [
                Check("applies", "Επιβεβαίωση ότι ισχύει στην περιοχή", "Confirm whether monitoring applies to the region"),
                Check("traps", "Εγκατάσταση ή έλεγχος παγίδων", "Install or inspect pheromone traps where used"),
                Check("trap_id", "Αναγνωριστικό παγίδας", "Record trap identifier", type: ChecklistItemType.Text),
                Check("catches", "Συλλήψεις ανά περίοδο", "Record catches per monitoring period", type: ChecklistItemType.Number),
                Check("flowering", "Επίπεδο άνθισης", "Record flowering level", type: ChecklistItemType.Choice),
                Check("photos", "Φωτογραφίες", "Attach photos", type: ChecklistItemType.Photo, essential: false)
            ],
            [
                Seasonal("T11_MONITOR", "Είναι περίοδος παρακολούθησης πυρηνοτρήτη (όχι αυτόματη σύσταση ψεκασμού).",
                    "Olive-moth monitoring period — not an automatic spray recommendation.", "olive_moth_monitoring",
                    confidence: ProposalConfidence.WorthChecking, allowUnknownPhenology: false)
            ]),

        Entry("T12", "Εκτίμηση καρπόδεσης", "Fruit-set assessment", "Phenology",
            "Assess fruit set about 7–21 days after flowering ends.",
            Month(5, 1, 6, 30), Bbch(69, 79), "fruit_set", null,
            [
                Check("photos", "Φωτογραφία κλαδιών", "Photograph representative branches", type: ChecklistItemType.Photo),
                Check("set_level", "Καρπόδεση: Κακή / Μέτρια / Ισχυρή", "Fruit set: Poor, Medium or Strong", type: ChecklistItemType.Choice),
                Check("drop", "Πτώση καρπών", "Record fruit drop", essential: false),
                Check("bearing", "Τάση on-year/off-year", "Estimate on-year/off-year tendency", type: ChecklistItemType.Choice, essential: false),
                Check("water_stress", "Συμπτώματα υδατικής καταπόνησης", "Record water-stress symptoms", essential: false)
            ],
            [
                Seasonal("T12_SEASONAL", "Μετά την άνθιση, εκτιμήστε την καρπόδεση.",
                    "After flowering, assess fruit set.", "fruit_set_assessment",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T13", "Εγκατάσταση/ενεργοποίηση παγίδων δάκου", "Install or activate olive-fly monitoring", "Monitoring",
            "Start olive-fly monitoring when fruit becomes susceptible.",
            Month(6, 1, 7, 15), Bbch(71, 89), "fly_trap_install", null,
            [
                Check("trap_id", "Αναγνωριστικό παγίδας", "Trap identifier", type: ChecklistItemType.Text),
                Check("location", "Θέση", "Location", type: ChecklistItemType.Text),
                Check("install_date", "Ημερομηνία εγκατάστασης", "Installation date", type: ChecklistItemType.Text),
                Check("trap_type", "Τύπος παγίδας", "Trap type", type: ChecklistItemType.Choice),
                Check("photo", "Φωτογραφία", "Photo", type: ChecklistItemType.Photo, essential: false),
                Check("person", "Υπεύθυνος", "Responsible person", type: ChecklistItemType.Text, essential: false),
                Check("next_check", "Επόμενος έλεγχος", "Next inspection date", type: ChecklistItemType.Text)
            ],
            [
                Seasonal("T13_SEASONAL", "Ώρα να ενεργοποιήσετε την παρακολούθηση δάκου, αν υπάρχει καρπός.",
                    "Time to activate olive-fly monitoring if the field has fruit.", "olive_fly_activate",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T14", "Έλεγχος παγίδων δάκου και καρπών", "Inspect olive-fly traps and fruit", "Monitoring",
            "Weekly trap and fruit checks until harvest. Never auto-schedule a spray.",
            Month(6, 1, 12, 31), Bbch(71, 89), "fly_trap_inspect", null,
            [
                Check("catches", "Συλλήψεις παγίδας", "Trap catches", type: ChecklistItemType.Number),
                Check("period_days", "Περίοδος παγίδας σε ημέρες", "Trap period in days", type: ChecklistItemType.Number),
                Check("fruit_sample", "Δειγματοληψία καρπών", "Sampled fruit count", type: ChecklistItemType.Number),
                Check("affected", "Ύποπτοι καρποί", "Suspected affected fruit count", type: ChecklistItemType.Number, essential: false),
                Check("warning", "Επίσημη προειδοποίηση", "Official warning", essential: false),
                Check("photos", "Φωτογραφίες", "Photos", type: ChecklistItemType.Photo, essential: false),
                Check("decision", "Απόφαση γεωπόνου", "Agronomist decision", type: ChecklistItemType.Text, essential: false)
            ],
            [
                Seasonal("T14_CHECK", "Οι συνθήκες και οι καταγραφές δείχνουν ότι χρειάζεται έλεγχος παγίδων δάκου.",
                    "Conditions suggest an olive-fly trap and fruit check is due.", "olive_fly_weekly_check",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T15", "Προγραμματισμός άρδευσης", "Irrigation scheduling", "Irrigation",
            "Propose irrigation from water balance — never a fixed every-X-days rule alone.",
            Month(5, 1, 9, 30), null, "irrigation_event", "irrigation", Weather: "irrigation",
            Checklist:
            [
                Check("system_ok", "Σύστημα σε λειτουργία", "Irrigation system operational"),
                Check("duration", "Διάρκεια", "Duration", type: ChecklistItemType.Number),
                Check("volume", "Όγκος νερού", "Water volume", type: ChecklistItemType.QuantityWithUnit),
                Check("area", "Αρδευόμενη έκταση", "Irrigated area", type: ChecklistItemType.Text, essential: false)
            ],
            Rules:
            [
                Seasonal("T15_BALANCE", "Με τα σημερινά δεδομένα, το χωράφι μπορεί να χρειάζεται νερό σύντομα.",
                    "With current data, the field may need water soon.", "irrigation_deficit",
                    confidence: ProposalConfidence.WorthChecking, requiresIrrigated: true, allowUnknownPhenology: true)
            ],
            requiresIrrigated: true),

        Entry("T16", "Φυλλοδιαγνωστική Ιουλίου", "July leaf analysis", "Soil & Analysis",
            "July leaf analysis guides nutrition better than soil alone for olives.",
            Month(7, 1, 7, 31), null, "leaf_lab_results", "fertilizers",
            [
                Check("blocks", "Διαίρεση σε αντιπροσωπευτικά τμήματα", "Divide field into representative blocks"),
                Check("leaves", "Ώριμα φύλλα από μη καρποφόρους βλαστούς", "Mature leaves from non-bearing current-season shoots"),
                Check("count", "Περίπου 80–100 φύλλα ανά δείγμα", "Collect approximately 80–100 leaves per sample", type: ChecklistItemType.Confirmation),
                Check("canopy", "Δειγματοληψία γύρω από την κόμη", "Sample around the canopy at similar height"),
                Check("avoid_spray", "Όχι εντός 7 ημερών από φυλλική λίπανση", "Do not sample within seven days of relevant foliar nutrient application"),
                Check("lab", "Εργαστήριο", "Record laboratory", type: ChecklistItemType.Text),
                Check("upload", "Ανέβασμα αποτελεσμάτων", "Upload results", type: ChecklistItemType.Document)
            ],
            [
                Seasonal("T16_SEASONAL", "Τον Ιούλιο γίνεται συνήθως η φυλλοδιαγνωστική.",
                    "July is the usual window for leaf analysis.", "july_leaf_analysis",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T17", "Θερινός έλεγχος καταπόνησης", "Summer stress inspection", "Inspection",
            "Inspect under heat, high ET0 or irrigation deficit. Alert defaults, not a diagnosis.",
            Month(7, 1, 8, 31), null, "stress_inspection", null, Weather: "heat_stress",
            Checklist:
            [
                Check("irrigation", "Λειτουργία άρδευσης", "Irrigation operation"),
                Check("soil", "Κατάσταση εδάφους", "Soil condition"),
                Check("leaf", "Συμπτώματα φύλλων", "Leaf symptoms"),
                Check("fruit", "Συμπτώματα καρπών", "Fruit symptoms", essential: false),
                Check("pests", "Παράσιτα", "Pest symptoms", essential: false),
                Check("photos", "Φωτογραφίες", "Photos", type: ChecklistItemType.Photo),
                Check("area", "Πληγείσα έκταση", "Affected area", type: ChecklistItemType.Text, essential: false)
            ],
            Rules:
            [
                Seasonal("T17_SEASONAL", "Το καλοκαίρι αξίζει έλεγχος καταπόνησης, ειδικά με ζέστη.",
                    "A summer stress inspection is worth considering, especially in heat.", "summer_stress_window",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T18", "Προκαταρκτική εκτίμηση συγκομιδής", "Preliminary harvest estimate", "Harvest",
            "Estimate harvest timing and needs; never silently copy last year.",
            Month(8, 15, 9, 30), Bbch(75, 81), "harvest_estimate", null,
            [
                Check("start", "Αναμενόμενη έναρξη", "Expected harvest start", type: ChecklistItemType.Text),
                Check("olive_kg", "Εκτιμώμενα κιλά ελιάς", "Estimated olive kilograms", type: ChecklistItemType.Number),
                Check("output", "Προορισμός: λάδι ή επιτραπέζιες", "Intended output: oil or table olives", type: ChecklistItemType.Choice),
                Check("workers", "Εκτιμώμενοι εργάτες", "Estimated workers", type: ChecklistItemType.Number, essential: false),
                Check("days", "Ημέρες συγκομιδής", "Estimated harvest days", type: ChecklistItemType.Number, essential: false),
                Check("mill", "Προτίμηση ελαιοτριβείου", "Mill preference", type: ChecklistItemType.Text, essential: false)
            ],
            [
                Seasonal("T18_SEASONAL", "Κάντε μια προκαταρκτική εκτίμηση συγκομιδής.",
                    "Make a preliminary harvest estimate.", "harvest_estimate_window",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T19", "Κράτηση συνεργείου, εξοπλισμού και ελαιοτριβείου", "Book crew, equipment and mill", "Harvest",
            "Confirm collaborators and mill 4–6 weeks before harvest.",
            Month(9, 1, 11, 15), null, "harvest_booking", "collaborator_services",
            [
                Check("responsible", "Υπεύθυνος", "Responsible person", type: ChecklistItemType.Text),
                Check("crew", "Επικοινωνία συνεργείου", "Crew contacted"),
                Check("workers", "Αριθμός εργατών", "Number of workers", type: ChecklistItemType.Number),
                Check("equipment", "Κράτηση εξοπλισμού", "Equipment reserved"),
                Check("crates", "Κιβώτια/σακιά", "Crates/bags available"),
                Check("transport", "Μεταφορά", "Transport arranged"),
                Check("mill", "Επικοινωνία ελαιοτριβείου", "Mill contacted"),
                Check("date", "Προσωρινή ημερομηνία", "Date provisionally reserved", essential: false),
                Check("costs", "Εκτιμώμενα κόστη", "Estimated costs", type: ChecklistItemType.Number, essential: false)
            ],
            [
                Seasonal("T19_SEASONAL", "Επιβεβαιώστε συνεργείο, εξοπλισμό και ελαιοτριβείο πριν τη συγκομιδή.",
                    "Confirm crew, equipment and mill before harvest.", "harvest_booking_window",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T20", "Προετοιμασία συγκομιδής και έλεγχος PHI", "Pre-harvest readiness and PHI review", "Harvest",
            "Hard block harvest readiness if a pre-harvest interval has not elapsed.",
            Month(9, 15, 12, 31), Bbch(80, 89), "preharvest_ready", null,
            [
                Check("date", "Επιβεβαίωση ημερομηνίας συγκομιδής", "Confirm expected harvest date"),
                Check("ppp", "Ανασκόπηση φυτοπροστασίας", "Review all plant-protection applications"),
                Check("phi", "Έλεγχος διαστήματος πριν τη συγκομιδή (PHI)", "Verify each product’s pre-harvest interval", type: ChecklistItemType.Confirmation),
                Check("blocked", "Ανοιχτές μπλοκαρισμένες εργασίες", "Check unresolved blocked tasks"),
                Check("mill", "Επιβεβαίωση ελαιοτριβείου", "Confirm mill"),
                Check("transport", "Επιβεβαίωση μεταφοράς", "Confirm transport"),
                Check("equipment", "Εξοπλισμός συγκομιδής", "Confirm harvesting equipment"),
                Check("containers", "Δοχεία", "Confirm containers"),
                Check("weather", "Καιρός μικρής εμβέλειας", "Check short-range weather", essential: false),
                Check("fruit", "Κατάσταση καρπού", "Record fruit condition", essential: false)
            ],
            [
                Seasonal("T20_SEASONAL", "Πριν τη συγκομιδή, ελέγξτε ετοιμότητα και διάστημα PHI.",
                    "Before harvest, review readiness and pre-harvest intervals.", "preharvest_phi_review",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T21", "Συγκομιδή", "Harvest", "Harvest",
            "Harvest may span several days; record each batch.",
            Month(10, 1, 1, 31), Bbch(80, 89), "harvest_batch", "labor", Weather: "harvest",
            Checklist:
            [
                Check("date", "Ημερομηνία", "Date", type: ChecklistItemType.Text),
                Check("area", "Έκταση ή δέντρα", "Area or trees", type: ChecklistItemType.Text),
                Check("olive_kg", "Κιλά ελιάς", "Olive kilograms", type: ChecklistItemType.Number),
                Check("destination", "Προορισμός", "Destination", type: ChecklistItemType.Text),
                Check("mill", "Ελαιοτριβείο", "Mill", type: ChecklistItemType.Text, essential: false),
                Check("oil", "Κιλά/λίτρα λαδιού", "Oil kilograms/litres", type: ChecklistItemType.Number, essential: false),
                Check("workers", "Εργάτες", "Workers", type: ChecklistItemType.Number, essential: false),
                Check("photos", "Φωτογραφίες", "Photos", type: ChecklistItemType.Photo, essential: false),
                Check("notes", "Σημειώσεις", "Notes", type: ChecklistItemType.Text, essential: false)
            ],
            Rules:
            [
                Seasonal("T21_SEASONAL", "Είναι η περίοδος συγκομιδής ανάλογα με το χωράφι και τον στόχο.",
                    "Harvest period depending on field and objective.", "harvest_window",
                    confidence: ProposalConfidence.WorthChecking, allowUnknownPhenology: true)
            ]),

        Entry("T22", "Μετασυλλεκτική συμφωνία ποσοτήτων", "Post-harvest reconciliation", "Harvest",
            "Reconcile quantities and costs within about 7 days. Missing income is not zero income.",
            Month(10, 1, 2, 15), null, "harvest_reconcile", "mill",
            [
                Check("olives", "Επιβεβαίωση ποσοτήτων ελιάς", "Confirm all olive quantities"),
                Check("oil", "Επιβεβαίωση ποσοτήτων λαδιού", "Confirm oil quantities"),
                Check("mill_records", "Αρχεία ελαιοτριβείου", "Confirm mill records"),
                Check("labour", "Έξοδο εργασίας", "Add missing labour expense", essential: false),
                Check("transport", "Έξοδο μεταφοράς", "Add transport expense", essential: false),
                Check("mill_cost", "Έξοδο ελαιοτριβείου", "Add mill expense", essential: false),
                Check("income", "Έσοδο μόνο αν υπάρχει", "Add sale income only if actual income exists", essential: false),
                Check("yield", "Απόδοση", "Review yield"),
                Check("quality", "Ποιότητα", "Record quality results", essential: false)
            ],
            [
                Seasonal("T22_SEASONAL", "Μετά την τελική συγκομιδή, συμφωνήστε ποσότητες και κόστη.",
                    "After the final harvest batch, reconcile quantities and costs.", "post_harvest_reconcile",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T23", "Μετασυλλεκτικός έλεγχος χωραφιού", "Post-harvest field inspection", "Inspection",
            "Inspect within about 14 days after harvest. Failed items become proposals, not auto tasks.",
            Month(10, 1, 2, 28), null, "post_harvest_inspection", null,
            [
                Check("branches", "Σπασμένα κλαδιά", "Broken branches"),
                Check("trunk", "Ζημιές κορμού", "Trunk damage"),
                Check("compaction", "Συμπίεση εδάφους", "Soil compaction"),
                Check("fallen", "Πεσμένοι καρποί", "Fallen fruit", essential: false),
                Check("drainage", "Αποστράγγιση", "Drainage"),
                Check("equipment", "Ζημιές εξοπλισμού", "Equipment damage", essential: false),
                Check("disease", "Συμπτώματα ασθενειών", "Disease symptoms", essential: false),
                Check("photos", "Φωτογραφίες", "Photos", type: ChecklistItemType.Photo, essential: false),
                Check("followup", "Εργασίες παρακολούθησης", "Follow-up work", type: ChecklistItemType.Text, essential: false)
            ],
            [
                Seasonal("T23_SEASONAL", "Μετά τη συγκομιδή, κάντε έλεγχο του χωραφιού.",
                    "After harvest, inspect the field.", "post_harvest_inspection",
                    confidence: ProposalConfidence.WorthChecking)
            ]),

        Entry("T24", "Κλείσιμο χρονιάς αποτελεσμάτων", "Close result year", "Year review",
            "User explicitly confirms year close. Later additions remain editable with a marker.",
            Month(12, 15, 12, 31), null, "year_close", null,
            [
                Check("completed", "Ολοκληρωμένες εργασίες", "Completed work"),
                Check("cancelled", "Ακυρωμένες εργασίες", "Cancelled work", essential: false),
                Check("open", "Ανοιχτές εργασίες", "Unresolved work"),
                Check("harvest", "Αποτέλεσμα συγκομιδής", "Harvest result"),
                Check("income", "Καταχωρημένα έσοδα", "Posted income"),
                Check("expenses", "Καταχωρημένα έξοδα", "Posted expenses"),
                Check("confirm", "Κλείσιμο χρονιάς", "Confirm year close", type: ChecklistItemType.Confirmation)
            ],
            [
                Seasonal("T24_SEASONAL", "Όταν η συγκομιδή ολοκληρωθεί, μπορείτε να κλείσετε τη χρονιά.",
                    "When harvest is complete, you can close the result year.", "close_result_year",
                    confidence: ProposalConfidence.WorthChecking)
            ]),
    ];

    private static FieldWorkCatalogueEntry Entry(
        string code,
        string greek,
        string english,
        string category,
        string description,
        MonthDayRange? months,
        BbchRange? bbch,
        string completionSchema,
        string? financialCategory,
        List<TaskChecklistDefinition> Checklist,
        List<CatalogueRule> Rules,
        string? Weather = null,
        bool requiresIrrigated = false,
        bool isPlantProtectionTreatment = false) => new()
    {
        Code = code,
        GreekName = greek,
        EnglishName = english,
        Category = category,
        Description = description,
        CandidateMonthRange = months,
        CandidateBbchRange = bbch,
        DefaultDuration = TimeSpan.FromHours(2),
        WeatherRuleProfile = Weather,
        CompletionSchema = completionSchema,
        FinancialCategorySuggestion = financialCategory,
        DefaultChecklist = Checklist,
        Rules = Rules,
        RequiresIrrigatedField = requiresIrrigated,
        IsPlantProtectionTreatment = isPlantProtectionTreatment
    };

    private static CatalogueRule Seasonal(
        string ruleCode,
        string greek,
        string english,
        string reason,
        ProposalConfidence confidence = ProposalConfidence.SeasonalReminder,
        bool allowUnknownPhenology = true,
        bool requiresIrrigated = false) => new()
    {
        RuleCode = ruleCode,
        GreekExplanation = greek,
        EnglishExplanation = english,
        SourceType = ProposalSourceType.SeasonalBaseline,
        DefaultConfidence = confidence,
        ReasonCodes = [reason],
        AllowUnknownPhenology = allowUnknownPhenology,
        RequiresIrrigatedField = requiresIrrigated
    };

    private static MonthDayRange Month(int sm, int sd, int em, int ed) => new()
    {
        StartMonth = sm,
        StartDay = sd,
        EndMonth = em,
        EndDay = ed
    };

    private static BbchRange Bbch(int min, int max) => new() { MinCode = min, MaxCode = max };

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
