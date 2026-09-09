using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Seeds a multi-year Living Timeline for Giorgos Papadakis's groves
/// (owner@olivefarm.com). Idempotent via fixed document ids.
/// </summary>
public static class ChronologioDemoSeeder
{
    public const string OwnerId = DemoFarmDataSeeder.OwnerId;
    public const string ProducerId = DemoFarmDataSeeder.ProducerId;

    public static async Task SeedAsync(
        MongoDbContext context,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!string.Equals(configuration["DemoAccounts:Seed"], "true", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var fields = await context.GetCollection<FieldDocument>("fields")
            .Find(f => f.OwnerId == OwnerId)
            .ToListAsync(cancellationToken);

        if (fields.Count == 0)
        {
            logger.LogInformation("Chronologio demo skip: owner has no fields yet.");
            return;
        }

        var north = fields.FirstOrDefault(f => f.Id == DemoFarmDataSeeder.FieldIds[0])
                    ?? fields.FirstOrDefault(f => f.Name.Contains("North Olive", StringComparison.OrdinalIgnoreCase))
                    ?? fields[0];
        var south = fields.FirstOrDefault(f => f.Id == DemoFarmDataSeeder.FieldIds[1] && f.Id != north.Id)
                    ?? fields.FirstOrDefault(f => f.Id != north.Id
                                               && f.Name.Contains("South Valley", StringComparison.OrdinalIgnoreCase))
                    ?? fields.FirstOrDefault(f => f.Id != north.Id);

        var targets = south == null ? new[] { north } : new[] { north, south };

        var tasks = context.GetCollection<TaskDocument>("tasks");
        var expenses = context.GetCollection<FinancialEntryDocument>("financial_entries");
        var harvests = context.GetCollection<HarvestRecordDocument>("harvest_records");
        var notes = context.GetCollection<NoteDocument>("notes");

        var written = 0;
        foreach (var field in targets)
        {
            var storyIndex = field.Id == north.Id ? 1 : 2;
            written += await SeedFieldStoryAsync(
                field,
                storyIndex,
                tasks,
                expenses,
                harvests,
                notes,
                cancellationToken);
        }

        logger.LogInformation(
            "Chronologio demo seeded {Docs} documents across {Fields} fields for {Email}.",
            written,
            targets.Length,
            "owner@olivefarm.com");
    }

    private static async Task<int> SeedFieldStoryAsync(
        FieldDocument field,
        int storyIndex,
        IMongoCollection<TaskDocument> tasks,
        IMongoCollection<FinancialEntryDocument> expenses,
        IMongoCollection<HarvestRecordDocument> harvests,
        IMongoCollection<NoteDocument> notes,
        CancellationToken cancellationToken)
    {
        var prefix = storyIndex == 1 ? "67c801a1" : "67c801a2";
        var seq = 0;
        string NextId() => $"{prefix}{ (++seq).ToString("x16")}";

        var variety = string.IsNullOrWhiteSpace(field.Variety) ? "Κορωνέικη" : field.Variety!;
        var mill = storyIndex == 1 ? "Ελαιοτριβείο Φιλιατρών" : "Crete Hills Mill";
        var isNorth = storyIndex == 1;
        var written = 0;

        // Year profiles: (calendarYear, lifecycleYear, oliveScale, oilYield, expenseScale, taskCostBias)
        var years = new (int Year, string Life, double OliveScale, double Yield, double ExpenseScale)[]
        {
            (2023, "low", isNorth ? 0.72 : 0.80, isNorth ? 16.8 : 17.4, 0.78),
            (2024, "high", isNorth ? 1.05 : 1.12, isNorth ? 17.9 : 18.2, 1.05),
            (2025, "low", isNorth ? 0.85 : 0.90, isNorth ? 17.1 : 17.6, 0.92),
            (2026, "high", isNorth ? 1.18 : 1.25, isNorth ? 18.0 : 18.5, 1.15),
        };

        foreach (var y in years)
        {
            var baseOlives = isNorth ? 9200.0 : 10800.0;
            var oliveKg = Math.Round(baseOlives * y.OliveScale / 10) * 10;
            var oilKg = Math.Round(oliveKg * y.Yield / 100.0, 1);
            var life = y.Life;

            // --- Winter pruning ---
            var pruneId = NextId();
            var pruneDate = Utc(y.Year, 2, isNorth ? 12 : 18, 9, 30);
            written += await UpsertTask(tasks, new TaskDocument
            {
                Id = pruneId,
                FieldId = field.Id,
                Type = "pruning",
                Title = "Κλάδεμα",
                Description = isNorth
                    ? "Αραίωμα κόμης στη βόρεια πλευρά. Αφήσαμε περισσότερο φως στα χαμηλά κλαδιά."
                    : "Κλάδεμα καρποφορίας· αφαίρεση ξερών κλαδιών μετά τη βαριά χρονιά.",
                LifecycleYear = life,
                AssignedTo = ProducerId,
                Status = "completed",
                ScheduledStart = pruneDate.AddDays(-1),
                ScheduledEnd = pruneDate,
                ActualStart = pruneDate.AddHours(-3),
                ActualEnd = pruneDate,
                Cost = Math.Round(280m * (decimal)y.ExpenseScale, 0),
                ApprovalStatus = "approved",
                CreatedAt = pruneDate,
                UpdatedAt = pruneDate
            }, cancellationToken);

            // --- Fertilization ---
            var fertId = NextId();
            var fertDate = Utc(y.Year, 3, isNorth ? 8 : 14, 10, 0);
            written += await UpsertTask(tasks, new TaskDocument
            {
                Id = fertId,
                FieldId = field.Id,
                Type = "fertilization",
                Title = "Λίπανση",
                Description = "Οργανική λίπανση κάτω από την κόμη.",
                LifecycleYear = life,
                AssignedTo = ProducerId,
                Status = "completed",
                ScheduledStart = fertDate,
                ScheduledEnd = fertDate,
                ActualEnd = fertDate,
                Cost = Math.Round(190m * (decimal)y.ExpenseScale, 0),
                ApprovalStatus = "approved",
                CreatedAt = fertDate,
                UpdatedAt = fertDate
            }, cancellationToken);

            written += await UpsertExpense(expenses, new FinancialEntryDocument
            {
                Id = NextId(),
                FieldId = field.Id,
                LifecycleYear = life,
                Kind = "expense",
                Amount = Math.Round(165m * (decimal)y.ExpenseScale, 0),
                Currency = "EUR",
                Description = "Λίπασμα + μεταφορά",
                Category = "fertilizers",
                Bucket = "inputs",
                OccurredOn = fertDate,
                Status = "posted",
                RecordedBy = OwnerId,
                CreatedAt = fertDate,
                UpdatedAt = fertDate
            }, cancellationToken);

            // --- Spring spray (dakos) ---
            var sprayId = NextId();
            var sprayDate = Utc(y.Year, 5, isNorth ? 6 : 11, 7, 45);
            written += await UpsertTask(tasks, new TaskDocument
            {
                Id = sprayId,
                FieldId = field.Id,
                Type = "spraying",
                Title = "Ψεκασμός – Δάκος",
                Description = y.Year >= 2025
                    ? "Έντονη παρουσία δάκου στα παγιδοκάλαθα· επαναληπτικός ψεκασμός."
                    : "Προληπτικός ψεκασμός για δάκο.",
                LifecycleYear = life,
                AssignedTo = ProducerId,
                Status = "completed",
                ScheduledStart = sprayDate,
                ScheduledEnd = sprayDate,
                ActualEnd = sprayDate,
                Cost = Math.Round(320m * (decimal)y.ExpenseScale, 0),
                ApprovalStatus = "approved",
                CreatedAt = sprayDate,
                UpdatedAt = sprayDate
            }, cancellationToken);

            // --- Summer irrigation ---
            var irrigDate = Utc(y.Year, 7, isNorth ? 9 : 16, 6, 20);
            written += await UpsertTask(tasks, new TaskDocument
            {
                Id = NextId(),
                FieldId = field.Id,
                Type = "irrigation",
                Title = "Άρδευση",
                Description = "Στάγδην άρδευση μετά από ξηρή εβδομάδα.",
                LifecycleYear = life,
                AssignedTo = ProducerId,
                Status = "completed",
                ScheduledStart = irrigDate,
                ScheduledEnd = irrigDate,
                ActualEnd = irrigDate,
                Cost = Math.Round(95m * (decimal)y.ExpenseScale, 0),
                ApprovalStatus = "approved",
                CreatedAt = irrigDate,
                UpdatedAt = irrigDate
            }, cancellationToken);

            written += await UpsertExpense(expenses, new FinancialEntryDocument
            {
                Id = NextId(),
                FieldId = field.Id,
                LifecycleYear = life,
                Kind = "expense",
                Amount = Math.Round(64m * (decimal)y.ExpenseScale, 0),
                Currency = "EUR",
                Description = "Diesel 40L — αντλία άρδευσης",
                Category = "electricity_fuel",
                Bucket = "other",
                OccurredOn = irrigDate,
                Status = "posted",
                RecordedBy = OwnerId,
                CreatedAt = irrigDate,
                UpdatedAt = irrigDate
            }, cancellationToken);

            // --- Late summer observation ---
            var noteDate = Utc(y.Year, 8, isNorth ? 22 : 27, 17, 10);
            var noteId = NextId();
            var noteBody = y.Year == 2026
                ? (isNorth
                    ? "Έντονη παρουσία δάκου στη βόρεια πλευρά. Τα δέντρα δίπλα στο μονοπάτι έχουν λιγότερο καρπό."
                    : "Καρπός ομοιόμορφος. Η νότια πλαγιά φαίνεται πιο δυνατή από πέρυσι.")
                : (isNorth
                    ? $"Παρατήρηση Αυγούστου {y.Year}: υγρασία εδάφους χαμηλή κάτω από τα μεγάλα δέντρα."
                    : $"Παρατήρηση {y.Year}: καλή ανθοφορία την άνοιξη· καρπόδεση ικανοποιητική.");

            written += await UpsertNote(notes, new NoteDocument
            {
                Id = noteId,
                OwnerUserId = OwnerId,
                Body = noteBody,
                FieldId = field.Id,
                Pinned = y.Year == 2026,
                OccurredAt = noteDate,
                CreatedAt = noteDate,
                UpdatedAt = noteDate
            }, cancellationToken);

            // No stock photography — only real /uploads media belongs in Chronologio.

            // --- Harvest ---
            var harvestDate = Utc(y.Year, 10, isNorth ? 7 : 14, 10, 30);
            var harvestId = NextId();
            written += await UpsertHarvest(harvests, new HarvestRecordDocument
            {
                Id = harvestId,
                FieldId = field.Id,
                OwnerId = OwnerId,
                HarvestDate = harvestDate,
                HarvestMethod = isNorth ? "Χειρονακτική / κτένες" : "Μηχανική + δίχτυα",
                WorkersUsed = isNorth ? 6 : 8,
                OliveKg = oliveKg,
                MillName = mill,
                OilKg = oilKg,
                OilYieldPercent = y.Yield,
                QualityGrade = y.Yield >= 18 ? "Έξτρα παρθένο" : "Παρθένο",
                Notes = $"{variety} — συγκομιδή {y.Year}. Απόδοση {y.Yield:0.0}%.",
                Status = "posted",
                CreatedAt = harvestDate,
                UpdatedAt = harvestDate
            }, cancellationToken);

            written += await UpsertTask(tasks, new TaskDocument
            {
                Id = NextId(),
                FieldId = field.Id,
                Type = "harvest",
                Title = $"Συγκομιδή — {variety}",
                Description = $"{oliveKg:0} kg ελιές → {oilKg:0.#} kg λάδι ({y.Yield:0.0}%).",
                LifecycleYear = life,
                AssignedTo = ProducerId,
                Status = "completed",
                ScheduledStart = harvestDate.Date,
                ScheduledEnd = harvestDate,
                ActualStart = harvestDate.AddHours(-4),
                ActualEnd = harvestDate,
                Cost = Math.Round(780m * (decimal)y.ExpenseScale, 0),
                ApprovalStatus = "approved",
                CreatedAt = harvestDate,
                UpdatedAt = harvestDate
            }, cancellationToken);

            written += await UpsertExpense(expenses, new FinancialEntryDocument
            {
                Id = NextId(),
                FieldId = field.Id,
                LifecycleYear = life,
                HarvestId = harvestId,
                Kind = "expense",
                Amount = Math.Round(420m * (decimal)y.ExpenseScale, 0),
                Currency = "EUR",
                Description = "Κόστος ελαιοτριβείου",
                Category = "mill_cost",
                Bucket = "harvest",
                OccurredOn = harvestDate.AddHours(5),
                Status = "posted",
                RecordedBy = OwnerId,
                CreatedAt = harvestDate,
                UpdatedAt = harvestDate
            }, cancellationToken);

            written += await UpsertExpense(expenses, new FinancialEntryDocument
            {
                Id = NextId(),
                FieldId = field.Id,
                LifecycleYear = life,
                Kind = "expense",
                Amount = Math.Round(560m * (decimal)y.ExpenseScale, 0),
                Currency = "EUR",
                Description = "Ημερομίσθια συγκομιδής",
                Category = "labor",
                Bucket = "labor",
                OccurredOn = harvestDate.AddHours(-2),
                Status = "posted",
                RecordedBy = OwnerId,
                CreatedAt = harvestDate,
                UpdatedAt = harvestDate
            }, cancellationToken);

            // Extra September work in 2026 so month zoom feels full
            if (y.Year == 2026)
            {
                var sepSpray = Utc(2026, 9, 6, 14, 10);
                written += await UpsertTask(tasks, new TaskDocument
                {
                    Id = NextId(),
                    FieldId = field.Id,
                    Type = "spraying",
                    Title = "Ψεκασμός – Δάκος",
                    Description = "12 στρέμματα· δεύτερος γύρος πριν τη συγκομιδή.",
                    LifecycleYear = life,
                    AssignedTo = ProducerId,
                    Status = "completed",
                    ActualEnd = sepSpray,
                    ScheduledEnd = sepSpray,
                    Cost = 290m,
                    ApprovalStatus = "approved",
                    CreatedAt = sepSpray,
                    UpdatedAt = sepSpray
                }, cancellationToken);

                written += await UpsertExpense(expenses, new FinancialEntryDocument
                {
                    Id = NextId(),
                    FieldId = field.Id,
                    LifecycleYear = life,
                    Kind = "expense",
                    Amount = 64m,
                    Currency = "EUR",
                    Description = "Diesel 40L",
                    Category = "electricity_fuel",
                    Bucket = "other",
                    OccurredOn = Utc(2026, 9, 7, 8, 15),
                    Status = "posted",
                    RecordedBy = OwnerId,
                    CreatedAt = Utc(2026, 9, 7, 8, 15),
                    UpdatedAt = Utc(2026, 9, 7, 8, 15)
                }, cancellationToken);
            }
        }

        return written;
    }

    private static DateTime Utc(int y, int m, int d, int h, int min) =>
        new(y, m, d, h, min, 0, DateTimeKind.Utc);

    private static async Task<int> UpsertTask(
        IMongoCollection<TaskDocument> col,
        TaskDocument doc,
        CancellationToken ct)
    {
        await col.ReplaceOneAsync(x => x.Id == doc.Id, doc, new ReplaceOptions { IsUpsert = true }, ct);
        return 1;
    }

    private static async Task<int> UpsertExpense(
        IMongoCollection<FinancialEntryDocument> col,
        FinancialEntryDocument doc,
        CancellationToken ct)
    {
        await col.ReplaceOneAsync(x => x.Id == doc.Id, doc, new ReplaceOptions { IsUpsert = true }, ct);
        return 1;
    }

    private static async Task<int> UpsertHarvest(
        IMongoCollection<HarvestRecordDocument> col,
        HarvestRecordDocument doc,
        CancellationToken ct)
    {
        await col.ReplaceOneAsync(x => x.Id == doc.Id, doc, new ReplaceOptions { IsUpsert = true }, ct);
        return 1;
    }

    private static async Task<int> UpsertNote(
        IMongoCollection<NoteDocument> col,
        NoteDocument doc,
        CancellationToken ct)
    {
        await col.ReplaceOneAsync(x => x.Id == doc.Id, doc, new ReplaceOptions { IsUpsert = true }, ct);
        return 1;
    }
}
