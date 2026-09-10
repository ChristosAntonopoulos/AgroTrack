using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Hierarchical service taxonomy. Parent slugs stay stable for existing listings.
/// labor, planting, and other remain as child slugs under harvest / agronomist / admin.
/// </summary>
public static class ServiceCategorySeeder
{
    public sealed record CategorySeed(
        string Id,
        string Slug,
        string? ParentSlug,
        bool Prominent,
        int Sort,
        string Icon,
        string NameEl,
        string NameEn,
        string NameIt,
        string DescEl,
        string DescEn,
        string DescIt,
        string[] TaskTypes);

    private const string IdPrefix = "675666666666666666666";

    public static readonly CategorySeed[] Catalog =
    [
        Parent("001", "pruning", true, 1, "scissors", "Κλάδεμα", "Pruning", "Potatura",
            "Κλαδεύτες για ελαιώνες.", "Pruners for olive groves.", "Potatori per oliveti.", ["pruning"]),
        Parent("002", "harvest", true, 2, "basket", "Συγκομιδή", "Harvest", "Raccolta",
            "Συνεργεία συγκομιδής ελιάς.", "Olive harvest crews.", "Squadre di raccolta olive.",
            ["harvest", "harvest_daily_kilos", "harvest_ready_nets", "harvest_check_access", "harvest_call_crew"]),
        Parent("003", "machinery", true, 3, "tractor", "Μηχανήματα", "Machinery", "Macchinari",
            "Μηχανήματα και χειριστές.", "Machines and operators.", "Macchine e operatori.", ["harvest_ready_nets"]),
        Parent("004", "agronomist", true, 4, "leaf", "Γεωπόνος", "Agronomist", "Agronomo",
            "Συμβουλές καλλιέργειας και επισκέψεις.", "Crop advice and grove visits.", "Consulenza agronomica.",
            ["general_field_inspection"]),
        Parent("005", "irrigation", true, 5, "droplets", "Άρδευση", "Irrigation", "Irrigazione",
            "Συστήματα και έλεγχος άρδευσης.", "Irrigation systems and checks.", "Impianti e controlli irrigui.",
            ["irrigation_check"]),
        Parent("006", "plant-protection", true, 6, "shield", "Φυτοπροστασία", "Plant protection", "Difesa",
            "Ψεκασμοί και παγίδες.", "Spraying and trapping.", "Trattamenti e trappole.", []),
        Parent("007", "transport", true, 7, "truck", "Μεταφορά", "Transport", "Trasporto",
            "Μεταφορά ελιάς και εξοπλισμού.", "Transport of olives and equipment.", "Trasporto olive e attrezzature.", []),
        Parent("008", "olive-mill", true, 8, "factory", "Ελαιοτριβείο", "Olive mill", "Frantoio",
            "Ελαιοτριβεία και ραντεβού άλεσης.", "Mills and milling slots.", "Frantoi e slot di molitura.",
            ["harvest_book_mill"]),
        Parent("011", "soil", false, 9, "sprout", "Λίπανση & έδαφος", "Fertilization & soil", "Concimazione e suolo",
            "Λίπανση, κομπόστ και φροντίδα εδάφους.", "Fertilization, compost, and soil care.",
            "Concimazione, compost e cura del suolo.", []),
        Parent("014", "analyses", false, 10, "test-tube", "Αναλύσεις", "Analyses", "Analisi",
            "Εδαφολογικές, φυλλικές και ελαιοκομικές αναλύσεις.", "Soil, leaf, and oil analyses.",
            "Analisi di suolo, foglia e olio.", ["soil_analysis"]),
        Parent("015", "repairs", false, 11, "wrench", "Επισκευές εξοπλισμού", "Equipment repairs", "Riparazioni",
            "Επισκευή μηχανημάτων και αρδευτικών.", "Repair of machines and irrigation.",
            "Riparazione di macchine e irrigazione.", []),
        Parent("016", "post-harvest", false, 12, "package", "Μετασυλλεκτικά", "Post-harvest", "Post-raccolta",
            "Αποθήκευση και διαλογή μετά τη συγκομιδή.", "Storage and sorting after harvest.",
            "Stoccaggio e cernita dopo la raccolta.", []),
        Parent("012", "admin", false, 13, "clipboard", "Διοικητικές υπηρεσίες", "Admin services", "Servizi amministrativi",
            "Δηλώσεις, φάκελοι και γραφείο.", "Declarations and paperwork.", "Pratiche e burocrazia.", []),

        Child("017", "pruning-formation", "pruning", 101, "scissors", "Διαμόρφωση", "Formative pruning", "Potatura di formazione"),
        Child("018", "pruning-production", "pruning", 102, "scissors", "Παραγωγικό κλάδεμα", "Production pruning", "Potatura di produzione"),
        Child("019", "pruning-rejuvenation", "pruning", 103, "scissors", "Αναγέννηση", "Rejuvenation", "Rinnovo"),

        Child("009", "labor", "harvest", 201, "users", "Εργάτες συγκομιδής", "Harvest crew", "Manodopera raccolta"),
        Child("021", "harvest-nets", "harvest", 202, "basket", "Δίχτυα / προετοιμασία", "Nets & prep", "Reti e preparazione"),
        Child("022", "harvest-mechanical", "harvest", 203, "tractor", "Μηχανική συγκομιδή", "Mechanical harvest", "Raccolta meccanica"),

        Child("023", "machinery-tractor", "machinery", 301, "tractor", "Τρακτέρ", "Tractor", "Trattore"),
        Child("024", "machinery-shaker", "machinery", 302, "tractor", "Δονητής", "Shaker", "Scuotitore"),
        Child("025", "machinery-operator", "machinery", 303, "users", "Χειριστής", "Operator", "Operatore"),

        Child("026", "agronomist-visit", "agronomist", 401, "leaf", "Επίσκεψη στον ελαιώνα", "Grove visit", "Visita in oliveto"),
        Child("027", "agronomist-nutrition", "agronomist", 402, "leaf", "Θρέψη", "Nutrition plan", "Piano nutrizionale"),
        Child("010", "planting", "agronomist", 403, "sprout", "Φύτευση", "Planting", "Impianto"),

        Child("029", "irrigation-install", "irrigation", 501, "droplets", "Εγκατάσταση", "Installation", "Installazione"),
        Child("030", "irrigation-repair", "irrigation", 502, "droplets", "Επισκευή δικτύου", "Network repair", "Riparazione rete"),
        Child("031", "irrigation-schedule", "irrigation", 503, "droplets", "Πρόγραμμα ποτίσματος", "Scheduling", "Programmazione"),

        Child("032", "plant-protection-spray", "plant-protection", 601, "shield", "Ψεκασμοί", "Spraying", "Trattamenti"),
        Child("033", "plant-protection-traps", "plant-protection", 602, "shield", "Παγίδες", "Traps", "Trappole"),
        Child("034", "plant-protection-organic", "plant-protection", 603, "shield", "Βιολογική φυτοπροστασία", "Organic protection", "Difesa biologica"),

        Child("035", "transport-olives", "transport", 701, "truck", "Μεταφορά ελιάς", "Olive transport", "Trasporto olive"),
        Child("036", "transport-equipment", "transport", 702, "truck", "Μεταφορά εξοπλισμού", "Equipment transport", "Trasporto attrezzature"),

        Child("037", "mill-appointment", "olive-mill", 801, "factory", "Ραντεβού άλεσης", "Milling appointment", "Appuntamento molitura"),
        Child("038", "mill-organic", "olive-mill", 802, "factory", "Βιολογική γραμμή", "Organic line", "Linea biologica"),
        Child("039", "mill-two-phase", "olive-mill", 803, "factory", "Διφασικό", "Two-phase milling", "Molitura a due fasi"),

        Child("040", "soil-fertilization", "soil", 901, "sprout", "Λίπανση", "Fertilization", "Concimazione"),
        Child("041", "soil-compost", "soil", 902, "sprout", "Κομπόστ", "Compost", "Compost"),
        Child("042", "soil-organic", "soil", 903, "sprout", "Βιολογική λίπανση", "Organic feeding", "Nutrizione biologica"),

        Child("043", "analysis-soil", "analyses", 1001, "test-tube", "Εδαφολογική", "Soil analysis", "Analisi del suolo"),
        Child("044", "analysis-leaf", "analyses", 1002, "test-tube", "Φυλλική", "Leaf analysis", "Analisi fogliare"),
        Child("045", "analysis-oil", "analyses", 1003, "test-tube", "Ανάλυση λαδιού", "Oil analysis", "Analisi dell'olio"),

        Child("046", "repairs-irrigation", "repairs", 1101, "wrench", "Επισκευή άρδευσης", "Irrigation repair", "Riparazione irrigazione"),
        Child("047", "repairs-machinery", "repairs", 1102, "wrench", "Επισκευή μηχανημάτων", "Machinery repair", "Riparazione macchine"),

        Child("048", "post-harvest-storage", "post-harvest", 1201, "package", "Αποθήκευση", "Storage", "Stoccaggio"),
        Child("049", "post-harvest-sorting", "post-harvest", 1202, "package", "Διαλογή", "Sorting", "Cernita"),

        Child("050", "admin-declarations", "admin", 1301, "clipboard", "Δηλώσεις ΟΣΔΕ", "Subsidy declarations", "Dichiarazioni"),
        Child("051", "admin-subsidies", "admin", 1302, "clipboard", "Επιδοτήσεις / φάκελοι", "Grants & files", "Pratiche e bandi"),
        Child("013", "other", "admin", 1303, "more-horizontal", "Άλλο", "Other", "Altro"),
    ];

    public static async Task SeedAsync(MongoDbContext context, ILogger logger, CancellationToken cancellationToken)
    {
        var collection = context.GetCollection<ServiceCategoryDocument>("service_categories");
        var now = DateTime.UtcNow;

        foreach (var item in Catalog.Where(c => c.ParentSlug == null))
        {
            await UpsertAsync(collection, item, parentId: null, now, cancellationToken);
        }

        var parents = await collection.Find(FilterDefinition<ServiceCategoryDocument>.Empty).ToListAsync(cancellationToken);
        var parentIds = parents.ToDictionary(c => c.Slug, c => c.Id, StringComparer.OrdinalIgnoreCase);

        foreach (var item in Catalog.Where(c => c.ParentSlug != null))
        {
            parentIds.TryGetValue(item.ParentSlug!, out var parentId);
            await UpsertAsync(collection, item, parentId, now, cancellationToken);
        }

        logger.LogInformation(
            "Ensured {Count} service categories ({Parents} parents).",
            Catalog.Length,
            Catalog.Count(c => c.ParentSlug == null));
    }

    private static async Task UpsertAsync(
        IMongoCollection<ServiceCategoryDocument> collection,
        CategorySeed item,
        string? parentId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var existing = await collection.Find(c => c.Slug == item.Slug).FirstOrDefaultAsync(cancellationToken);
        var document = new ServiceCategoryDocument
        {
            Id = existing?.Id ?? item.Id,
            Slug = item.Slug,
            NameEl = item.NameEl,
            NameEn = item.NameEn,
            NameIt = item.NameIt,
            DescriptionEl = item.DescEl,
            DescriptionEn = item.DescEn,
            DescriptionIt = item.DescIt,
            Icon = item.Icon,
            ParentCategoryId = parentId,
            SortOrder = item.Sort,
            IsActive = true,
            IsProminent = item.Prominent && item.ParentSlug == null,
            SuggestedTaskTypes = item.TaskTypes.ToList(),
            CreatedAt = existing?.CreatedAt ?? now,
            UpdatedAt = now
        };

        await collection.ReplaceOneAsync(
            c => c.Slug == item.Slug,
            document,
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);
    }

    private static CategorySeed Parent(
        string suffix,
        string slug,
        bool prominent,
        int sort,
        string icon,
        string nameEl,
        string nameEn,
        string nameIt,
        string descEl,
        string descEn,
        string descIt,
        string[] taskTypes) =>
        new(IdPrefix + suffix, slug, null, prominent, sort, icon, nameEl, nameEn, nameIt, descEl, descEn, descIt, taskTypes);

    private static CategorySeed Child(
        string suffix,
        string slug,
        string parentSlug,
        int sort,
        string icon,
        string nameEl,
        string nameEn,
        string nameIt) =>
        new(IdPrefix + suffix, slug, parentSlug, false, sort, icon, nameEl, nameEn, nameIt, nameEl, nameEn, nameIt, []);
}
