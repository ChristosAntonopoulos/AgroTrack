using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Multi-year Living Timeline for Giorgos and Kostas on the two Filiatra parcels.
/// Completed work stops at "today". Harvest 2026 and prep sit in the future.
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
                    ?? fields.FirstOrDefault(f => f.Name.Contains("088", StringComparison.OrdinalIgnoreCase))
                    ?? fields[0];
        var south = fields.FirstOrDefault(f => f.Id == DemoFarmDataSeeder.FieldIds[1] && f.Id != north.Id)
                    ?? fields.FirstOrDefault(f => f.Id != north.Id
                                               && f.Name.Contains("089", StringComparison.OrdinalIgnoreCase))
                    ?? fields.FirstOrDefault(f => f.Id != north.Id);

        var targets = south == null ? new[] { north } : new[] { north, south };

        var tasks = context.GetCollection<TaskDocument>("tasks");
        var expenses = context.GetCollection<FinancialEntryDocument>("financial_entries");
        var harvests = context.GetCollection<HarvestRecordDocument>("harvest_records");
        var notes = context.GetCollection<NoteDocument>("notes");
        var activities = context.GetCollection<ActivityDocument>("activities");

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
                activities,
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
        IMongoCollection<ActivityDocument> activities,
        CancellationToken cancellationToken)
    {
        var prefix = storyIndex == 1 ? "67c801a1" : "67c801a2";
        var seq = 0;
        string NextId() => $"{prefix}{(++seq).ToString("x16")}";

        var variety = string.IsNullOrWhiteSpace(field.Variety) ? "Κορωνέικη" : field.Variety!;
        var mill = "Ελαιοτριβείο Φιλιατρών";
        var isNorth = storyIndex == 1;
        var written = 0;
        var today = DateTime.UtcNow;

        // Scaled to ~3 stremmata. High years pay; low years teach the biennial swing.
        var years = new (int Year, string Life, double OliveScale, double Yield, double ExpenseScale, double SalePerKg)[]
        {
            (2023, "low", isNorth ? 0.72 : 0.80, isNorth ? 16.8 : 17.4, 0.82, 6.40),
            (2024, "high", isNorth ? 1.05 : 1.12, isNorth ? 17.9 : 18.2, 1.05, 7.80),
            (2025, "low", isNorth ? 0.85 : 0.90, isNorth ? 17.1 : 17.6, 0.94, 7.10),
            (2026, "high", isNorth ? 1.18 : 1.25, isNorth ? 18.0 : 18.5, 1.12, 0),
        };

        foreach (var y in years)
        {
            var baseOlives = isNorth ? 1450.0 : 1280.0;
            var oliveKg = Math.Round(baseOlives * y.OliveScale / 5) * 5;
            var oilKg = Math.Round(oliveKg * y.Yield / 100.0, 1);
            var life = y.Life;

            var pruneDate = Utc(y.Year, 2, isNorth ? 12 : 18, 9, 30);
            if (pruneDate <= today)
            {
                var pruneId = NextId();
                written += await UpsertTask(tasks, Completed(
                    pruneId, field.Id, "Pruning", "Κλάδεμα",
                    isNorth
                        ? "Αραίωμα κόμης στη βόρεια πλευρά. Περισσότερο φως στα χαμηλά κλαδιά."
                        : "Κλάδεμα καρποφορίας· βγάλαμε τα ξερά μετά τη βαριά χρονιά.",
                    life, pruneDate, Math.Round(95m * (decimal)y.ExpenseScale, 0), "approved"), cancellationToken);
            }

            var fertDate = Utc(y.Year, 3, isNorth ? 8 : 14, 10, 0);
            if (fertDate <= today)
            {
                var fertId = NextId();
                written += await UpsertTask(tasks, Completed(
                    fertId, field.Id, "Fertilization", "Λίπανση",
                    "Οργανική λίπανση κάτω από την κόμη, σύμφωνα με την ανάλυση.",
                    life, fertDate, Math.Round(70m * (decimal)y.ExpenseScale, 0), "approved"), cancellationToken);

                written += await UpsertExpense(expenses, Expense(
                    NextId(), field.Id, life, Math.Round(58m * (decimal)y.ExpenseScale, 0),
                    "Λίπασμα + μεταφορά", "fertilizers", "inputs", fertDate), cancellationToken);
            }

            var sprayDate = Utc(y.Year, 5, isNorth ? 6 : 11, 7, 45);
            if (sprayDate <= today)
            {
                written += await UpsertTask(tasks, Completed(
                    NextId(), field.Id, "Pest Monitoring", "Ψεκασμός – Δάκος",
                    y.Year >= 2025
                        ? "Έντονη παρουσία στα παγιδοκάλαθα· επαναληπτικός ψεκασμός."
                        : "Προληπτικός ψεκασμός για δάκο.",
                    life, sprayDate, Math.Round(85m * (decimal)y.ExpenseScale, 0), "approved"), cancellationToken);

                written += await UpsertExpense(expenses, Expense(
                    NextId(), field.Id, life, Math.Round(42m * (decimal)y.ExpenseScale, 0),
                    "Δολωματικός ψεκασμός δάκου", "treatments", "inputs", sprayDate), cancellationToken);
            }

            var irrigDate = Utc(y.Year, 7, isNorth ? 9 : 16, 6, 20);
            if (irrigDate <= today)
            {
                written += await UpsertTask(tasks, Completed(
                    NextId(), field.Id, "Irrigation", "Άρδευση",
                    "Στάγδην άρδευση μετά από ξηρή εβδομάδα.",
                    life, irrigDate, Math.Round(35m * (decimal)y.ExpenseScale, 0), "approved"), cancellationToken);

                written += await UpsertExpense(expenses, Expense(
                    NextId(), field.Id, life, Math.Round(22m * (decimal)y.ExpenseScale, 0),
                    "Diesel 20L — αντλία άρδευσης", "electricity_fuel", "inputs", irrigDate), cancellationToken);
            }

            var noteDate = Utc(y.Year, 8, isNorth ? 22 : 27, 17, 10);
            if (noteDate <= today)
            {
                var noteBody = y.Year == 2026
                    ? (isNorth
                        ? "Έντονη παρουσία δάκου στη βόρεια πλευρά. Τα δέντρα δίπλα στο μονοπάτι έχουν λιγότερο καρπό."
                        : "Καρπός ομοιόμορφος. Η νότια πλευρά φαίνεται πιο δυνατή από πέρυσι.")
                    : (isNorth
                        ? $"Παρατήρηση Αυγούστου {y.Year}: υγρασία εδάφους χαμηλή κάτω από τα μεγάλα δέντρα."
                        : $"Παρατήρηση {y.Year}: καλή ανθοφορία την άνοιξη· καρπόδεση ικανοποιητική.");

                written += await UpsertNote(notes, new NoteDocument
                {
                    Id = NextId(),
                    OwnerUserId = OwnerId,
                    Body = noteBody,
                    FieldId = field.Id,
                    Pinned = y.Year == 2026 && isNorth,
                    OccurredAt = noteDate,
                    CreatedAt = noteDate,
                    UpdatedAt = noteDate
                }, cancellationToken);
            }

            if (y.Year < 2026)
            {
                var harvestDate = Utc(y.Year, 10, isNorth ? 7 : 14, 10, 30);
                var harvestId = NextId();
                written += await UpsertHarvest(harvests, new HarvestRecordDocument
                {
                    Id = harvestId,
                    FieldId = field.Id,
                    OwnerId = OwnerId,
                    HarvestDate = harvestDate,
                    HarvestMethod = isNorth ? "Χειρονακτική / κτένες" : "Κτένες + δίχτυα",
                    WorkersUsed = isNorth ? 4 : 5,
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

                written += await UpsertTask(tasks, Completed(
                    NextId(), field.Id, "Harvest", $"Συγκομιδή — {variety}",
                    $"{oliveKg:0} kg ελιές → {oilKg:0.#} kg λάδι ({y.Yield:0.0}%).",
                    life, harvestDate, Math.Round(240m * (decimal)y.ExpenseScale, 0), "approved",
                    harvestPhase: "daily"), cancellationToken);

                written += await UpsertExpense(expenses, Expense(
                    NextId(), field.Id, life, Math.Round(95m * (decimal)y.ExpenseScale, 0),
                    "Κόστος ελαιοτριβείου", "mill_cost", "harvest", harvestDate.AddHours(5), harvestId), cancellationToken);

                written += await UpsertExpense(expenses, Expense(
                    NextId(), field.Id, life, Math.Round(180m * (decimal)y.ExpenseScale, 0),
                    "Ημερομίσθια συγκομιδής", "harvest_workers", "harvest", harvestDate.AddHours(-2)), cancellationToken);

                var sale = Math.Round((decimal)(oilKg * y.SalePerKg), 0);
                written += await UpsertExpense(expenses, new FinancialEntryDocument
                {
                    Id = NextId(),
                    FieldId = field.Id,
                    LifecycleYear = life,
                    HarvestId = harvestId,
                    Kind = "income",
                    Amount = sale,
                    Currency = "EUR",
                    Description = $"Πώληση λαδιού {y.Year}",
                    Category = "other",
                    Bucket = "harvest",
                    OccurredOn = harvestDate.AddDays(18),
                    Status = "posted",
                    RecordedBy = OwnerId,
                    CreatedAt = harvestDate.AddDays(18),
                    UpdatedAt = harvestDate.AddDays(18)
                }, cancellationToken);
            }
        }

        written += await SeedCurrentAndUpcomingAsync(
            field, isNorth, variety, NextId, tasks, expenses, notes, activities, today, cancellationToken);

        return written;
    }

    private static async Task<int> SeedCurrentAndUpcomingAsync(
        FieldDocument field,
        bool isNorth,
        string variety,
        Func<string> nextId,
        IMongoCollection<TaskDocument> tasks,
        IMongoCollection<FinancialEntryDocument> expenses,
        IMongoCollection<NoteDocument> notes,
        IMongoCollection<ActivityDocument> activities,
        DateTime today,
        CancellationToken cancellationToken)
    {
        const string life = "high";
        var written = 0;
        var fieldId = field.Id;

        // Yesterday / this week — completed, waiting on Giorgos
        var sepSpray = Utc(2026, 9, 6, 14, 10);
        var sepSprayId = nextId();
        written += await UpsertTask(tasks, Completed(
            sepSprayId, fieldId, "Pest Monitoring", "Ψεκασμός – Δάκος",
            "Δεύτερος γύρος πριν τη συγκομιδή. 12 παγιδοκάλαθα ελέγχθηκαν.",
            life, sepSpray, 68m, isNorth ? "pending" : "approved"), cancellationToken);

        written += await UpsertExpense(expenses, Expense(
            nextId(), fieldId, life, 28m, "Diesel 15L", "electricity_fuel", "inputs",
            Utc(2026, 9, 7, 8, 15)), cancellationToken);

        if (isNorth)
        {
            var rejected = Utc(2026, 9, 4, 16, 0);
            written += await UpsertTask(tasks, Completed(
                nextId(), fieldId, "Weed Management", "Καθαρισμός πρόσβασης",
                "Καθάρισμα ζιζανίων στην είσοδο. Ο Γιώργος ζήτησε δεύτερο πέρασμα πριν έρθει το συνεργείο.",
                life, rejected, 40m, "rejected",
                harvestPhase: "prepare"), cancellationToken);

            var scoutingStart = Utc(2026, 9, 8, 7, 30);
            written += await UpsertTask(tasks, new TaskDocument
            {
                Id = nextId(),
                FieldId = fieldId,
                Type = "Pest Monitoring",
                Title = "Παρακολούθηση δάκου",
                Description = "Έλεγχος παγίδων κάθε δεύτερη μέρα μέχρι να κλείσει ο καρπός.",
                LifecycleYear = life,
                AssignedTo = ProducerId,
                Status = "in_progress",
                ScheduledStart = scoutingStart,
                ScheduledEnd = Utc(2026, 9, 12, 18, 0),
                ActualStart = scoutingStart,
                ApprovalStatus = "not_required",
                CreatedAt = scoutingStart.AddDays(-1),
                UpdatedAt = today
            }, cancellationToken);

            written += await UpsertNote(notes, new NoteDocument
            {
                Id = nextId(),
                OwnerUserId = OwnerId,
                Body = "Σημείωση 8/9: ο Κώστας είδε περισσότερα τσιμπήματα στα δέντρα δίπλα στο μονοπάτι. Κρατάμε τον Οκτώβρη ως στόχο συγκομιδής.",
                FieldId = fieldId,
                Pinned = false,
                OccurredAt = Utc(2026, 9, 8, 18, 40),
                CreatedAt = Utc(2026, 9, 8, 18, 40),
                UpdatedAt = Utc(2026, 9, 8, 18, 40)
            }, cancellationToken);

            written += await UpsertActivity(activities, new ActivityDocument
            {
                Id = nextId(),
                FieldId = fieldId,
                Type = "task_started",
                Message = "Ο Κώστας ξεκίνησε παρακολούθηση δάκου",
                ActorUserId = ProducerId,
                TaskId = sepSprayId,
                Timestamp = scoutingStart
            }, cancellationToken);
        }
        else
        {
            written += await UpsertTask(tasks, new TaskDocument
            {
                Id = nextId(),
                FieldId = fieldId,
                Type = "Observation",
                Title = "Γενικός έλεγχος αγρού",
                Description = "Περπάτημα πριν κλείσουμε ημερομηνία μύλου. Καρπός, δίχτυα, είσοδος.",
                LifecycleYear = life,
                AssignedTo = ProducerId,
                Status = "pending",
                ScheduledStart = Utc(2026, 9, 11, 8, 0),
                ScheduledEnd = Utc(2026, 9, 11, 12, 0),
                ApprovalStatus = "not_required",
                CreatedAt = Utc(2026, 9, 8, 9, 0),
                UpdatedAt = Utc(2026, 9, 8, 9, 0)
            }, cancellationToken);
        }

        // Owner books the mill himself
        written += await UpsertTask(tasks, new TaskDocument
        {
            Id = nextId(),
            FieldId = fieldId,
            Type = "harvest_book_mill",
            Title = "Κλείσιμο ραντεβού μύλου",
            Description = isNorth
                ? "Τηλέφωνο στο Ελαιοτριβείο Φιλιατρών για 7 Οκτωβρίου."
                : "Δεύτερη μέρα μύλου για την Κορωνέικη — 14 Οκτωβρίου.",
            LifecycleYear = life,
            HarvestPhase = "prepare",
            AssignedTo = OwnerId,
            Status = "pending",
            ScheduledStart = Utc(2026, 9, isNorth ? 16 : 17, 10, 0),
            ScheduledEnd = Utc(2026, 9, isNorth ? 16 : 17, 11, 0),
            ApprovalStatus = "not_required",
            CreatedAt = today,
            UpdatedAt = today
        }, cancellationToken);

        written += await UpsertTask(tasks, Upcoming(
            nextId(), fieldId, "harvest_check_access", "Έλεγχος εισόδου και καιρού",
            "Δρόμος, στροφή τρακτέρ, πρόγνωση αέρα πριν έρθει το συνεργείο.",
            Utc(2026, 9, isNorth ? 20 : 22, 8, 0), 2, "prepare"), cancellationToken);

        written += await UpsertTask(tasks, Upcoming(
            nextId(), fieldId, "harvest_ready_nets", "Έτοιμα δίχτυα και κλούβες",
            "Δίχτυα, κλούβες, κτένες. Να μην χάσουμε ώρα το πρωί της συγκομιδής.",
            Utc(2026, 9, isNorth ? 24 : 26, 9, 0), 1, "prepare"), cancellationToken);

        written += await UpsertTask(tasks, Upcoming(
            nextId(), fieldId, "harvest_call_crew", "Κλήση συνεργείου",
            "Επιβεβαίωση με την Ελένη πόσα άτομα έρχονται και τι ώρα.",
            Utc(2026, 9, isNorth ? 28 : 29, 18, 0), 0, "prepare"), cancellationToken);

        var harvestDay = Utc(2026, 10, isNorth ? 7 : 14, 7, 0);
        written += await UpsertTask(tasks, new TaskDocument
        {
            Id = nextId(),
            FieldId = fieldId,
            Type = "Harvest",
            Title = $"Συγκομιδή — {variety}",
            Description = isNorth
                ? "Στόχος ~1.700 kg. Χειρονακτικά / κτένες. Μύλος το απόγευμα."
                : "Στόχος ~1.600 kg. Κτένες + δίχτυα. Μύλος 14/10.",
            LifecycleYear = life,
            HarvestPhase = "daily",
            AssignedTo = ProducerId,
            Status = "pending",
            ScheduledStart = harvestDay,
            ScheduledEnd = harvestDay.AddHours(8),
            ApprovalStatus = "not_required",
            CreatedAt = today,
            UpdatedAt = today
        }, cancellationToken);

        written += await UpsertTask(tasks, Upcoming(
            nextId(), fieldId, "harvest_mill_delivery", "Παράδοση στο ελαιοτριβείο",
            "Ζύγιση ελιάς, απόδοση, κόστος μύλου.",
            Utc(2026, 10, isNorth ? 7 : 14, 16, 0), 0, "final"), cancellationToken);

        written += await UpsertTask(tasks, Upcoming(
            nextId(), fieldId, "Soil & Analysis", "Ανάλυση εδάφους μετά τη συγκομιδή",
            "Δείγματα από τις δύο ζώνες για το χειμερινό πλάνο λίπανσης.",
            Utc(2026, 11, isNorth ? 5 : 8, 9, 0), 1), cancellationToken);

        written += await UpsertTask(tasks, Upcoming(
            nextId(), fieldId, "Irrigation", "Χειμερινός έλεγχος άρδευσης",
            "Άδειασμα γραμμών και προστασία βανών.",
            Utc(2026, 11, isNorth ? 20 : 22, 10, 0), 0), cancellationToken);

        if (isNorth)
        {
            written += await UpsertTask(tasks, Upcoming(
                nextId(), fieldId, "harvest_close_season", "Κλείσιμο συγκομιδής",
                "Σημείωση πώλησης όταν μπει το λάδι και κλείσιμο της χρονιάς.",
                Utc(2026, 11, 15, 11, 0), 0, "final"), cancellationToken);
        }

        return written;
    }

    private static TaskDocument Completed(
        string id, string fieldId, string type, string title, string description,
        string life, DateTime when, decimal cost, string approval, string? harvestPhase = null) =>
        new()
        {
            Id = id,
            FieldId = fieldId,
            Type = type,
            Title = title,
            Description = description,
            LifecycleYear = life,
            HarvestPhase = harvestPhase,
            AssignedTo = ProducerId,
            Status = "completed",
            ScheduledStart = when.AddHours(-3),
            ScheduledEnd = when,
            ActualStart = when.AddHours(-3),
            ActualEnd = when,
            Cost = cost,
            ApprovalStatus = approval,
            ApprovalNote = approval == "approved"
                ? "Καλή δουλειά — εγκρίθηκε για πληρωμή."
                : approval == "rejected"
                    ? "Ξαναπέρασμα στην είσοδο πριν έρθει το συνεργείο."
                    : null,
            Notes = "Σημείωση Κώστα: έγινε όπως συμφωνήσαμε.",
            CreatedAt = when.AddDays(-2),
            UpdatedAt = when
        };

    private static TaskDocument Upcoming(
        string id, string fieldId, string type, string title, string description,
        DateTime start, int extraDays, string? harvestPhase = null) =>
        new()
        {
            Id = id,
            FieldId = fieldId,
            Type = type,
            Title = title,
            Description = description,
            LifecycleYear = "high",
            HarvestPhase = harvestPhase,
            AssignedTo = ProducerId,
            Status = "pending",
            ScheduledStart = start,
            ScheduledEnd = start.AddDays(extraDays).AddHours(3),
            ApprovalStatus = "not_required",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

    private static FinancialEntryDocument Expense(
        string id, string fieldId, string life, decimal amount,
        string description, string category, string bucket, DateTime when, string? harvestId = null) =>
        new()
        {
            Id = id,
            FieldId = fieldId,
            LifecycleYear = life,
            HarvestId = harvestId,
            Kind = "expense",
            Amount = amount,
            Currency = "EUR",
            Description = description,
            Category = category,
            Bucket = bucket,
            OccurredOn = when,
            Status = "posted",
            RecordedBy = OwnerId,
            CreatedAt = when,
            UpdatedAt = when
        };

    private static DateTime Utc(int y, int m, int d, int h, int min) =>
        new(y, m, d, h, min, 0, DateTimeKind.Utc);

    private static async Task<int> UpsertTask(IMongoCollection<TaskDocument> col, TaskDocument doc, CancellationToken ct)
    {
        await col.ReplaceOneAsync(x => x.Id == doc.Id, doc, new ReplaceOptions { IsUpsert = true }, ct);
        return 1;
    }

    private static async Task<int> UpsertExpense(IMongoCollection<FinancialEntryDocument> col, FinancialEntryDocument doc, CancellationToken ct)
    {
        await col.ReplaceOneAsync(x => x.Id == doc.Id, doc, new ReplaceOptions { IsUpsert = true }, ct);
        return 1;
    }

    private static async Task<int> UpsertHarvest(IMongoCollection<HarvestRecordDocument> col, HarvestRecordDocument doc, CancellationToken ct)
    {
        await col.ReplaceOneAsync(x => x.Id == doc.Id, doc, new ReplaceOptions { IsUpsert = true }, ct);
        return 1;
    }

    private static async Task<int> UpsertNote(IMongoCollection<NoteDocument> col, NoteDocument doc, CancellationToken ct)
    {
        await col.ReplaceOneAsync(x => x.Id == doc.Id, doc, new ReplaceOptions { IsUpsert = true }, ct);
        return 1;
    }

    private static async Task<int> UpsertActivity(IMongoCollection<ActivityDocument> col, ActivityDocument doc, CancellationToken ct)
    {
        await col.ReplaceOneAsync(x => x.Id == doc.Id, doc, new ReplaceOptions { IsUpsert = true }, ct);
        return 1;
    }

}
