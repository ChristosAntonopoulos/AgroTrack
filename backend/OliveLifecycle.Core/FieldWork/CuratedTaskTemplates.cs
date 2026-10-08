namespace OliveLifecycle.Core.FieldWork;

/// <summary>
/// Farmer-facing curated template set for schedule picker and suggestions.
/// Full catalogue (T01–T24) remains available for labels/history.
/// </summary>
public static class CuratedTaskTemplates
{
    public static readonly IReadOnlyList<string> Codes =
    [
        "T06", // Κλάδεμα καρποφορίας
        "T05", // Βασική λίπανση
        "T09", // Χόρτα και κάλυψη εδάφους
        "T14", // Έλεγχος παγίδων δάκου
        "T08", // Έλεγχος αρδευτικού
        "T20", // Προετοιμασία συγκομιδής
        "T21", // Συγκομιδή
        "T23"  // Μετασυλλεκτικός έλεγχος
    ];

    public static readonly IReadOnlyDictionary<string, string> DisplayTitlesEl =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["T06"] = "Κλάδεμα καρποφορίας",
            ["T05"] = "Βασική λίπανση",
            ["T09"] = "Χόρτα και κάλυψη εδάφους",
            ["T14"] = "Έλεγχος παγίδων δάκου",
            ["T08"] = "Έλεγχος αρδευτικού",
            ["T20"] = "Προετοιμασία συγκομιδής",
            ["T21"] = "Συγκομιδή",
            ["T23"] = "Μετασυλλεκτικός έλεγχος"
        };

    public static readonly IReadOnlyDictionary<string, string> DisplayTitlesEn =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["T06"] = "Fruiting pruning",
            ["T05"] = "Base fertilisation",
            ["T09"] = "Ground cover and weeds",
            ["T14"] = "Olive-fly trap check",
            ["T08"] = "Irrigation system check",
            ["T20"] = "Harvest preparation",
            ["T21"] = "Harvest",
            ["T23"] = "Post-harvest grove check"
        };

    public static bool IsCurated(string? templateCode) =>
        !string.IsNullOrWhiteSpace(templateCode)
        && Codes.Contains(templateCode, StringComparer.OrdinalIgnoreCase);

    public static string DisplayTitle(string templateCode, string language = "el")
    {
        var map = language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
            ? DisplayTitlesEn
            : DisplayTitlesEl;
        if (map.TryGetValue(templateCode, out var title))
        {
            return title;
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
}
