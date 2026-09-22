using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Core.Finance;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Two closed olive years (2024, 2025) plus the open 2026 season for the Παπαδάκης household.
/// Giorgos keeps the books, Kostas does the field work, Eleni brings the mill papers.
/// Harvest 2026 is not posted yet — picking has not started.
/// Legacy TaskDocument ("tasks") rows are intentionally skipped; FieldWork owns tasks.
/// </summary>
public static class ChronologioDemoSeeder
{
    public const string OwnerId = DemoFarmDataSeeder.OwnerId;
    public const string ProducerId = DemoFarmDataSeeder.ProducerId;
    public const string FamilyUserId = DemoFarmDataSeeder.FamilyUserId;

    /// <summary>Olive oil density used only to derive labelled litres from kg for demo harvests.</summary>
    private const decimal OilKgPerLitre = 0.916m;

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

        var targets = DemoFarmDataSeeder.FieldIds
            .Select(id => fields.FirstOrDefault(f => f.Id == id))
            .Where(f => f != null)
            .Cast<FieldDocument>()
            .ToList();

        if (targets.Count == 0)
        {
            targets = fields.Take(3).ToList();
        }

        var expenses = context.GetCollection<FinancialTransactionDocument>("financial_transactions");
        var harvests = context.GetCollection<HarvestRecordDocument>("harvest_records");
        var notes = context.GetCollection<NoteDocument>("notes");
        var activities = context.GetCollection<ActivityDocument>("activities");

        var written = 0;
        for (var i = 0; i < targets.Count; i++)
        {
            written += await SeedFieldStoryAsync(
                targets[i],
                storyIndex: i + 1,
                expenses,
                harvests,
                notes,
                activities,
                cancellationToken);
        }

        logger.LogInformation(
            "Chronologio demo seeded {Docs} documents across {Fields} fields for {Email}.",
            written,
            targets.Count,
            "owner@olivefarm.com");
    }

    private static async Task<int> SeedFieldStoryAsync(
        FieldDocument field,
        int storyIndex,
        IMongoCollection<FinancialTransactionDocument> expenses,
        IMongoCollection<HarvestRecordDocument> harvests,
        IMongoCollection<NoteDocument> notes,
        IMongoCollection<ActivityDocument> activities,
        CancellationToken cancellationToken)
    {
        var prefix = storyIndex switch
        {
            1 => "67c801a1",
            2 => "67c801a2",
            _ => "67c801a3",
        };
        var seq = 0;
        string NextId() => $"{prefix}{(++seq).ToString("x16")}";

        var variety = string.IsNullOrWhiteSpace(field.Variety) ? "Κορωνέικη" : field.Variety!;
        var mill = "Ελαιοτριβείο Φιλιατρών";
        var scale = storyIndex switch
        {
            1 => 1.00,
            2 => 0.92,
            _ => 0.78,
        };
        var written = 0;
        var today = DateTime.UtcNow;

        // Two closed years, then the open season. ~2.5–3 stremmata. 2025 is the lighter bearing year.
        var years = new (int Year, double OliveFactor, double YieldPercent, decimal OilPerLitre, decimal TablePerKg)[]
        {
            (2024, 1.00, 17.6, 7.80m, 1.80m),
            (2025, 0.78, 16.2, 6.90m, 1.60m),
            (2026, 1.05, 0, 0m, 0m),
        };

        foreach (var y in years)
        {
            var baseOlives = 1200.0 * scale * y.OliveFactor;
            var oliveKg = Math.Round(baseOlives / 5) * 5;
            var isTableGrove = storyIndex == 3;
            var tableKg = isTableGrove ? Math.Round(oliveKg * 0.55 / 5) * 5 : 0;
            var milledKg = oliveKg - tableKg;
            var oilYield = isTableGrove ? 11.0 : y.YieldPercent;
            var oilKg = y.Year < 2026 ? Math.Round(milledKg * oilYield / 100.0, 1) : 0;
            var oilLitres = oilKg > 0
                ? decimal.Round((decimal)oilKg / OilKgPerLitre, 1, MidpointRounding.AwayFromZero)
                : 0m;

            var fertDate = Utc(y.Year, 3, 6 + storyIndex, 10, 0);
            if (fertDate <= today)
            {
                const decimal fertKg = 50m;
                const decimal fertPrice = 1.16m;
                written += await UpsertExpense(expenses, Money(
                    DemoFarmDataSeeder.SeasonMoneyId(y.Year, storyIndex, 1), field.Id,
                    FinancialCalculator.RoundMoney(fertKg * fertPrice),
                    "Λίπασμα 20-10-10, 2 σακιά", "fertilizers", fertDate,
                    quantity: fertKg, unit: "kilogram", unitPrice: fertPrice,
                    calculationMode: "quantity_times_unit_price", productKind: "fertilizer",
                    taskId: DemoFarmDataSeeder.SeasonTaskId(y.Year, storyIndex, 2)), cancellationToken);
            }

            var sprayDate = Utc(y.Year, 5, 4 + storyIndex, 7, 45);
            if (sprayDate <= today)
            {
                const decimal sprayLitres = 2m;
                const decimal sprayPrice = 21m;
                written += await UpsertExpense(expenses, Money(
                    DemoFarmDataSeeder.SeasonMoneyId(y.Year, storyIndex, 2), field.Id,
                    FinancialCalculator.RoundMoney(sprayLitres * sprayPrice),
                    "Δολωματικός ψεκασμός δάκου", "plant_protection", sprayDate,
                    quantity: sprayLitres, unit: "litre", unitPrice: sprayPrice,
                    calculationMode: "quantity_times_unit_price", productKind: "plant_protection",
                    taskId: DemoFarmDataSeeder.SeasonTaskId(y.Year, storyIndex, 3)), cancellationToken);
            }

            var irrigDate = Utc(y.Year, 7, 7 + storyIndex, 6, 20);
            if (irrigDate <= today)
            {
                const decimal fuelLitres = 18m;
                const decimal fuelPrice = 1.72m;
                written += await UpsertExpense(expenses, Money(
                    DemoFarmDataSeeder.SeasonMoneyId(y.Year, storyIndex, 3), field.Id,
                    FinancialCalculator.RoundMoney(fuelLitres * fuelPrice),
                    "Πετρέλαιο για την αντλία", "fuel_and_energy", irrigDate,
                    quantity: fuelLitres, unit: "litre", unitPrice: fuelPrice,
                    calculationMode: "quantity_times_unit_price", productKind: "fuel"), cancellationToken);
            }

            var noteDate = Utc(y.Year, 8, 20 + storyIndex * 2, 17, 10);
            if (noteDate <= today)
            {
                var noteBody = y.Year == 2026
                    ? storyIndex switch
                    {
                        1 => "Έντονη παρουσία δάκου στη βόρεια πλευρά. Τα δέντρα δίπλα στο μονοπάτι έχουν λιγότερο καρπό.",
                        2 => "Καρπός ομοιόμορφος. Η νότια πλευρά φαίνεται πιο δυνατή από πέρυσι.",
                        _ => "Καλαμών: καλό μέγεθος καρπού. Κρατάμε Οκτώβρη για συγκομιδή επιτραπέζιας.",
                    }
                    : storyIndex switch
                    {
                        1 => $"Παρατήρηση Αυγούστου {y.Year}: υγρασία εδάφους χαμηλή κάτω από τα μεγάλα δέντρα.",
                        2 => $"Παρατήρηση {y.Year}: καλή ανθοφορία την άνοιξη· καρπόδεση ικανοποιητική.",
                        _ => $"Παρατήρηση {y.Year}: Καλαμών με ομοιόμορφη ανάπτυξη στη δυτική πλευρά.",
                    };

                written += await UpsertNote(notes, new NoteDocument
                {
                    Id = NextId(),
                    OwnerUserId = OwnerId,
                    Body = noteBody,
                    FieldId = field.Id,
                    Pinned = false,
                    OccurredAt = noteDate,
                    CreatedAt = noteDate,
                    UpdatedAt = noteDate
                }, cancellationToken);

                if (y.Year == 2026 && storyIndex == 1)
                {
                    written += await UpsertActivity(activities, new ActivityDocument
                    {
                        Id = NextId(),
                        FieldId = field.Id,
                        Type = "note_created",
                        Message = "Ο Κώστας κατέγραψε παρουσία δάκου",
                        ActorUserId = ProducerId,
                        Timestamp = noteDate
                    }, cancellationToken);
                }
            }

            if (y.Year < 2026)
            {
                var harvestDate = Utc(y.Year, 10, 8 + storyIndex, 8, 30);
                var harvestId = DemoFarmDataSeeder.SeasonHarvestId(y.Year, storyIndex);
                var harvestTaskId = DemoFarmDataSeeder.SeasonTaskId(y.Year, storyIndex, 4);
                var workers = storyIndex == 3 ? 4 : 3;
                const decimal dayRate = 55m;
                var sackCount = (int)Math.Round(oliveKg / 25.0);
                written += await UpsertHarvest(harvests, new HarvestRecordDocument
                {
                    Id = harvestId,
                    FieldId = field.Id,
                    OwnerId = OwnerId,
                    HarvestDate = harvestDate,
                    ResultYear = y.Year,
                    HarvestMethod = isTableGrove ? "Χειρονακτική, για επιτραπέζια" : "Χτένες και δίχτυα",
                    WorkersUsed = workers,
                    SackCount = sackCount,
                    OliveKg = oliveKg,
                    MillName = mill,
                    OilKg = oilKg,
                    OilLitres = oilLitres > 0 ? oilLitres : null,
                    ConversionFactor = OilKgPerLitre,
                    ConversionSource = "mill_ticket",
                    ConversionRecordedAt = harvestDate.AddDays(1),
                    OilYieldPercent = oilYield,
                    QualityGrade = oilYield >= 17 ? "Έξτρα παρθένο" : "Παρθένο",
                    Notes = isTableGrove
                        ? $"{variety} {y.Year}: {tableKg:0} kg επιτραπέζιες και {oilLitres:0.0} L λάδι από τα υπόλοιπα."
                        : $"{variety} {y.Year}: {sackCount} τσουβάλια, {oilLitres:0.0} L, απόδοση {oilYield:0.0}%.",
                    Status = "posted",
                    CreatedAt = harvestDate,
                    UpdatedAt = harvestDate.AddDays(1)
                }, cancellationToken);

                var millAmount = FinancialCalculator.RoundMoney((decimal)milledKg * 0.08m);
                written += await UpsertExpense(expenses, Money(
                    DemoFarmDataSeeder.SeasonMoneyId(y.Year, storyIndex, 4), field.Id, millAmount,
                    "Ελαιοτριβείο Φιλιατρών", "mill", harvestDate.AddHours(6), harvestId: harvestId,
                    quantity: (decimal)milledKg, unit: "kilogram", unitPrice: 0.08m,
                    calculationMode: "quantity_times_unit_price", productKind: "mill",
                    taskId: harvestTaskId, createdByUserId: FamilyUserId,
                    counterparty: mill), cancellationToken);

                written += await UpsertExpense(expenses, Money(
                    DemoFarmDataSeeder.SeasonMoneyId(y.Year, storyIndex, 5), field.Id,
                    FinancialCalculator.RoundMoney(workers * dayRate),
                    "Μεροκάματα συγκομιδής", "labor", harvestDate.AddHours(-1), harvestId: harvestId,
                    quantity: workers, unit: "workday", unitPrice: dayRate,
                    calculationMode: "quantity_times_unit_price", productKind: "labour",
                    taskId: harvestTaskId, collaboratorId: ProducerId), cancellationToken);

                if (oilLitres > 0)
                {
                    written += await UpsertExpense(expenses, Money(
                        DemoFarmDataSeeder.SeasonMoneyId(y.Year, storyIndex, 6), field.Id,
                        FinancialCalculator.RoundMoney(oilLitres * y.OilPerLitre),
                        "Πώληση ελαιολάδου", "olive_oil_sale",
                        harvestDate.AddDays(12), type: "income", harvestId: harvestId,
                        quantity: oilLitres, unit: "litre", unitPrice: y.OilPerLitre,
                        calculationMode: "quantity_times_unit_price", productKind: "olive_oil",
                        counterparty: "Αγοραστής Φιλιατρών"), cancellationToken);
                }

                if (tableKg > 0)
                {
                    written += await UpsertExpense(expenses, Money(
                        DemoFarmDataSeeder.SeasonMoneyId(y.Year, storyIndex, 7), field.Id,
                        FinancialCalculator.RoundMoney((decimal)tableKg * y.TablePerKg),
                        "Πώληση επιτραπέζιας Καλαμών", "olive_sale",
                        harvestDate.AddDays(6), type: "income", harvestId: harvestId,
                        quantity: (decimal)tableKg, unit: "kilogram", unitPrice: y.TablePerKg,
                        calculationMode: "quantity_times_unit_price", productKind: "olives",
                        counterparty: "Συσκευαστήριο Καλαμάτας"), cancellationToken);
                }

                if (storyIndex == 1)
                {
                    var millNoteDate = harvestDate.AddDays(1);
                    written += await UpsertNote(notes, new NoteDocument
                    {
                        Id = NextId(),
                        OwnerUserId = OwnerId,
                        Body = y.Year == 2025
                            ? $"Παραλάβαμε {oilLitres:0.0} L από το ελαιοτριβείο. Κρατάμε το ζυγολόγιο στον φάκελο {y.Year}."
                            : $"Ζυγολόγιο {y.Year}: {oilLitres:0.0} L · απόδοση {oilYield:0.0}%. Το χαρτί του μύλου είναι στον φάκελο.",
                        FieldId = field.Id,
                        Pinned = false,
                        OccurredAt = millNoteDate,
                        CreatedAt = millNoteDate,
                        UpdatedAt = millNoteDate
                    }, cancellationToken);

                    written += await UpsertActivity(activities, new ActivityDocument
                    {
                        Id = NextId(),
                        FieldId = field.Id,
                        Type = "note_created",
                        Message = "Η Ελένη κατέγραψε το ζυγολόγιο του ελαιοτριβείου",
                        ActorUserId = FamilyUserId,
                        Timestamp = millNoteDate
                    }, cancellationToken);
                }
            }
        }

        written += await SeedCurrentAndUpcomingAsync(
            field, storyIndex, NextId, expenses, notes, activities, cancellationToken);

        return written;
    }

    private static async Task<int> SeedCurrentAndUpcomingAsync(
        FieldDocument field,
        int storyIndex,
        Func<string> nextId,
        IMongoCollection<FinancialTransactionDocument> expenses,
        IMongoCollection<NoteDocument> notes,
        IMongoCollection<ActivityDocument> activities,
        CancellationToken cancellationToken)
    {
        var written = 0;
        var fieldId = field.Id;

        written += await UpsertExpense(expenses, Money(
            nextId(), fieldId, 28.05m, "Πετρέλαιο για αντλία άρδευσης", "fuel_and_energy",
            Utc(2026, 9, 5 + storyIndex, 8, 15),
            quantity: 15m, unit: "litre", unitPrice: 1.87m,
            calculationMode: "quantity_times_unit_price", productKind: "fuel"), cancellationToken);

        if (storyIndex == 1)
        {
            // Giorgos decision note — pinned so the year opens with intent.
            written += await UpsertNote(notes, new NoteDocument
            {
                Id = nextId(),
                OwnerUserId = OwnerId,
                Body = "Κλείνουμε ραντεβού στο Ελαιοτριβείο Φιλιατρών για αρχές Οκτωβρίου. Κρατάμε τον στόχο συγκομιδής μετά τον πρώτο ψεκασμό.",
                FieldId = fieldId,
                Pinned = true,
                OccurredAt = Utc(2026, 9, 4, 19, 10),
                CreatedAt = Utc(2026, 9, 4, 19, 10),
                UpdatedAt = Utc(2026, 9, 4, 19, 10)
            }, cancellationToken);

            written += await UpsertNote(notes, new NoteDocument
            {
                Id = nextId(),
                OwnerUserId = OwnerId,
                Body = "Σημείωση 8/9: περισσότερα τσιμπήματα δάκου στα δέντρα δίπλα στο μονοπάτι. Οι παγίδες ανεβαίνουν μέχρι τις 12/9.",
                FieldId = fieldId,
                Pinned = false,
                OccurredAt = Utc(2026, 9, 8, 18, 40),
                CreatedAt = Utc(2026, 9, 8, 18, 40),
                UpdatedAt = Utc(2026, 9, 8, 18, 40)
            }, cancellationToken);

            var scoutingStart = Utc(2026, 9, 8, 7, 30);
            written += await UpsertActivity(activities, new ActivityDocument
            {
                Id = nextId(),
                FieldId = fieldId,
                Type = "note_created",
                Message = "Ο Κώστας σημείωσε παρακολούθηση δάκου",
                ActorUserId = ProducerId,
                Timestamp = scoutingStart
            }, cancellationToken);

            written += await UpsertNote(notes, new NoteDocument
            {
                Id = nextId(),
                OwnerUserId = OwnerId,
                Body = "Οι φάκελοι 2024 και 2025 είναι κλειστοί. Περιμένουμε τον Οκτώβρη για να κλείσουμε το ελαιοτριβείο.",
                FieldId = fieldId,
                Pinned = false,
                OccurredAt = Utc(2026, 9, 9, 11, 20),
                CreatedAt = Utc(2026, 9, 9, 11, 20),
                UpdatedAt = Utc(2026, 9, 9, 11, 20)
            }, cancellationToken);

            written += await UpsertActivity(activities, new ActivityDocument
            {
                Id = nextId(),
                FieldId = fieldId,
                Type = "note_created",
                Message = "Η Ελένη έλεγξε τους φακέλους συγκομιδής",
                ActorUserId = FamilyUserId,
                Timestamp = Utc(2026, 9, 9, 11, 20)
            }, cancellationToken);
        }

        return written;
    }

    private static FinancialTransactionDocument Money(
        string id,
        string fieldId,
        decimal amount,
        string description,
        string category,
        DateTime when,
        string type = "expense",
        string? harvestId = null,
        decimal? quantity = null,
        string? unit = null,
        decimal? unitPrice = null,
        string calculationMode = "total_only",
        string? productKind = null,
        string? createdByUserId = null,
        string? taskId = null,
        string? counterparty = null,
        string? collaboratorId = null) =>
        new()
        {
            Id = id,
            OwnerUserId = OwnerId,
            Type = type,
            Status = "posted",
            Amount = amount,
            Currency = "EUR",
            OccurredOn = when,
            // Καλλιεργητική χρονιά: Jan stays with prior Feb–Jan year.
            ResultYear = when.Month >= 2 ? when.Year : when.Year - 1,
            FieldId = fieldId,
            Category = category,
            ProductKind = productKind,
            Quantity = quantity,
            QuantityUnit = unit,
            UnitPrice = unitPrice,
            CalculationMode = calculationMode,
            Description = description,
            CounterpartyName = counterparty,
            RelatedTaskId = taskId,
            RelatedHarvestId = harvestId,
            RelatedCollaboratorId = collaboratorId,
            SourceType = taskId != null ? "task" : harvestId != null ? "harvest" : "manual",
            IdempotencyKey = id,
            CreatedByUserId = createdByUserId ?? OwnerId,
            CreatedAt = when,
            UpdatedAt = when,
            PostedAt = when
        };

    private static DateTime Utc(int y, int m, int d, int h, int min) =>
        new(y, m, d, h, min, 0, DateTimeKind.Utc);

    private static async Task<int> UpsertExpense(IMongoCollection<FinancialTransactionDocument> col, FinancialTransactionDocument doc, CancellationToken ct)
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
