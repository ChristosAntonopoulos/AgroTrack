using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.FieldWork;

/// <summary>
/// Farmer-facing curated templates for schedule picker and suggestions.
/// Full catalogue (T01–T24) remains available for labels/history/seasonal rules.
/// </summary>
public static class CuratedTaskTemplates
{
    public sealed record FarmerTemplate(
        string Code,
        string TitleEl,
        string TitleEn,
        string DescriptionEl,
        string DescriptionEn,
        IReadOnlyList<string> ChecklistEl,
        IReadOnlyList<string> ChecklistEn);

    public static readonly IReadOnlyList<FarmerTemplate> FarmerTemplates =
    [
        new(
            "T06",
            "Κλάδεμα",
            "Pruning",
            "Κλάδεψε και καθάρισε τα δέντρα για σωστό αερισμό και παραγωγή.",
            "Prune and clear the trees for airflow and production.",
            ["Έλεγχος εργαλείων", "Κλάδεμα δέντρων", "Καθάρισμα κλαδιών"],
            ["Check tools", "Prune trees", "Clear branches"]),
        new(
            "T05",
            "Λίπανση",
            "Fertilisation",
            "Βάλε τη λίπανση που αποφάσισες για τον ελαιώνα.",
            "Apply the fertiliser you chose for the grove.",
            ["Επιλογή λιπάσματος", "Εφαρμογή", "Σημείωσε ποσότητα / κόστος"],
            ["Choose fertiliser", "Apply", "Note quantity / cost"]),
        new(
            "T15",
            "Πότισμα",
            "Watering",
            "Έλεγξε ή κάνε άρδευση στον ελαιώνα.",
            "Check or irrigate the grove.",
            ["Έλεγχος νερού", "Έλεγχος σωλήνων / σταλακτών", "Σημείωσε διάρκεια"],
            ["Check water", "Check pipes / drippers", "Note duration"]),
        new(
            "T14",
            "Έλεγχος δάκου",
            "Olive-fly check",
            "Έλεγξε παγίδες και σημάδια προσβολής.",
            "Check traps and signs of infestation.",
            ["Έλεγχος παγίδων", "Παρατήρηση καρπού", "Πρόσθεσε φωτογραφία αν χρειάζεται"],
            ["Check traps", "Observe fruit", "Add a photo if needed"]),
        new(
            "T09",
            "Καθαρισμός εδάφους",
            "Ground clearing",
            "Κόψε χόρτα ή καθάρισε τον χώρο γύρω από τα δέντρα.",
            "Cut grass or clear the ground around the trees.",
            ["Έλεγχος περιοχής", "Κοπή / καθαρισμός", "Απομάκρυνση υπολειμμάτων"],
            ["Check the area", "Cut / clear", "Remove leftovers"]),
        new(
            "T21",
            "Συγκομιδή",
            "Harvest",
            "Οργάνωσε και ολοκλήρωσε τη συγκομιδή.",
            "Organise and complete the harvest.",
            ["Δίχτυα και εργαλεία", "Μάζεμα σακιών", "Καταγραφή κιλών / εξόδων"],
            ["Nets and tools", "Gather sacks", "Record kilos / costs"]),
        new(
            "T02",
            "Επίσκεψη στον ελαιώνα",
            "Grove visit",
            "Μια γενική επίσκεψη για να δεις τι χρειάζεται.",
            "A general visit to see what is needed.",
            ["Έλεγχος δέντρων", "Έλεγχος νερού / εδάφους", "Σημείωσε ό,τι παρατήρησες"],
            ["Check trees", "Check water / soil", "Note what you observed"]),
    ];

    public static readonly IReadOnlyList<string> Codes =
        FarmerTemplates.Select(t => t.Code).ToList();

    public static readonly IReadOnlyDictionary<string, string> DisplayTitlesEl =
        FarmerTemplates.ToDictionary(t => t.Code, t => t.TitleEl, StringComparer.OrdinalIgnoreCase);

    public static readonly IReadOnlyDictionary<string, string> DisplayTitlesEn =
        FarmerTemplates.ToDictionary(t => t.Code, t => t.TitleEn, StringComparer.OrdinalIgnoreCase);

    public static bool IsCurated(string? templateCode) =>
        !string.IsNullOrWhiteSpace(templateCode)
        && Codes.Contains(templateCode, StringComparer.OrdinalIgnoreCase);

    public static FarmerTemplate? GetFarmerTemplate(string? templateCode)
    {
        if (string.IsNullOrWhiteSpace(templateCode))
        {
            return null;
        }

        return FarmerTemplates.FirstOrDefault(t =>
            string.Equals(t.Code, templateCode, StringComparison.OrdinalIgnoreCase));
    }

    public static string DisplayTitle(string templateCode, string language = "el")
    {
        var farmer = GetFarmerTemplate(templateCode);
        if (farmer != null)
        {
            return language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
                ? farmer.TitleEn
                : farmer.TitleEl;
        }

        var entry = FieldWorkCatalogue.GetByCode(templateCode);
        if (entry is null)
        {
            return templateCode;
        }

        return language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
            ? entry.EnglishName
            : entry.GreekName;
    }

    public static string? Description(string templateCode, string language = "el")
    {
        var farmer = GetFarmerTemplate(templateCode);
        if (farmer is null)
        {
            return null;
        }

        return language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
            ? farmer.DescriptionEn
            : farmer.DescriptionEl;
    }

    public static List<TaskChecklistDefinition> ChecklistDefinitions(string templateCode)
    {
        var farmer = GetFarmerTemplate(templateCode);
        if (farmer is null)
        {
            return [];
        }

        var list = new List<TaskChecklistDefinition>();
        for (var i = 0; i < farmer.ChecklistEl.Count; i++)
        {
            list.Add(new TaskChecklistDefinition
            {
                Key = $"c{i + 1}",
                GreekLabel = farmer.ChecklistEl[i],
                EnglishLabel = i < farmer.ChecklistEn.Count ? farmer.ChecklistEn[i] : farmer.ChecklistEl[i],
                ItemType = ChecklistItemType.Checkbox,
                Requirement = ChecklistItemRequirement.Optional,
                IsEssential = true,
                SortOrder = i + 1
            });
        }

        return list;
    }
}
