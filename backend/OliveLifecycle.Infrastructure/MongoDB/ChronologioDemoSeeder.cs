using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Multi-year Living Timeline for the Παπαδάκης household on three Filiatra parcels.
/// Voices: Giorgos (owner decisions/field costs), Kostas (field observations),
/// Eleni (mill tickets / oil sales). Harvest 2026 stays unposted — the year is open.
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

        // Scaled to ~2.5–3 stremmata. High years pay; low years teach the biennial swing.
        // SalePerLitre is €/L for posted oil sales (quantity × unit price).
        var years = new (int Year, string Life, double OliveScale, double Yield, double ExpenseScale, decimal SalePerLitre)[]
        {
            (2023, "low", 0.72 * scale, 16.8, 0.82, 6.40m),
            (2024, "high", 1.05 * scale, 17.9, 1.05, 7.80m),
            (2025, "low", 0.85 * scale, 17.1, 0.94, 7.10m),
            (2026, "high", 1.18 * scale, 18.0, 1.12, 0m),
        };

        foreach (var y in years)
        {
            var baseOlives = 1450.0;
            var oliveKg = Math.Round(baseOlives * y.OliveScale / 5) * 5;
            var oilKg = Math.Round(oliveKg * y.Yield / 100.0, 1);
            var oilLitres = oilKg > 0
                ? decimal.Round((decimal)oilKg / OilKgPerLitre, 1, MidpointRounding.AwayFromZero)
                : 0m;

            var fertDate = Utc(y.Year, 3, 6 + storyIndex * 3, 10, 0);
            if (fertDate <= today)
            {
                var fertilizerAmount = Math.Round(58m * (decimal)y.ExpenseScale, 0);
                written += await UpsertExpense(expenses, Money(
                    NextId(), field.Id, fertilizerAmount,
                    "Λίπασμα και μεταφορά", "fertilizers", fertDate,
                    quantity: 50m, unit: "kilogram", unitPrice: RoundUnit(fertilizerAmount / 50m),
                    calculationMode: "quantity_and_total", productKind: "fertilizer"), cancellationToken);
            }

            var sprayDate = Utc(y.Year, 5, 4 + storyIndex * 3, 7, 45);
            if (sprayDate <= today)
            {
                written += await UpsertExpense(expenses, Money(
                    NextId(), field.Id, Math.Round(42m * (decimal)y.ExpenseScale, 0),
                    "Δολωματικός ψεκασμός δάκου", "plant_protection", sprayDate), cancellationToken);
            }

            var irrigDate = Utc(y.Year, 7, 7 + storyIndex * 3, 6, 20);
            if (irrigDate <= today)
            {
                written += await UpsertExpense(expenses, Money(
                    NextId(), field.Id, Math.Round(22m * (decimal)y.ExpenseScale, 0),
                    "Πετρέλαιο για αντλία άρδευσης", "fuel_and_energy", irrigDate,
                    quantity: 20m, unit: "litre",
                    unitPrice: RoundUnit(Math.Round(22m * (decimal)y.ExpenseScale, 0) / 20m),
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
                var harvestDate = Utc(y.Year, 10, 5 + storyIndex * 4, 10, 30);
                var harvestId = NextId();
                written += await UpsertHarvest(harvests, new HarvestRecordDocument
                {
                    Id = harvestId,
                    FieldId = field.Id,
                    OwnerId = OwnerId,
                    HarvestDate = harvestDate,
                    // Oct harvest belongs to καλλιεργητική χρονιά Y (Feb Y – Jan Y+1).
                    ResultYear = y.Year,
                    HarvestMethod = storyIndex == 1 ? "Χειρονακτική / κτένες" : "Κτένες + δίχτυα",
                    WorkersUsed = 3 + storyIndex,
                    OliveKg = oliveKg,
                    MillName = mill,
                    OilKg = oilKg,
                    OilLitres = oilLitres > 0 ? oilLitres : null,
                    ConversionFactor = OilKgPerLitre,
                    ConversionSource = "demo_seed_density",
                    ConversionRecordedAt = harvestDate,
                    OilYieldPercent = y.Yield,
                    QualityGrade = y.Yield >= 18 ? "Έξτρα παρθένο" : "Παρθένο",
                    Notes = $"{variety} — συγκομιδή {y.Year}. Απόδοση {y.Yield:0.0}%. {oilLitres:0.0} L.",
                    Status = "posted",
                    CreatedAt = harvestDate,
                    UpdatedAt = harvestDate
                }, cancellationToken);

                written += await UpsertExpense(expenses, Money(
                    NextId(), field.Id, Math.Round(95m * (decimal)y.ExpenseScale, 0),
                    "Κόστος ελαιοτριβείου", "mill", harvestDate.AddHours(5), harvestId: harvestId,
                    createdByUserId: FamilyUserId), cancellationToken);

                written += await UpsertExpense(expenses, Money(
                    NextId(), field.Id, Math.Round(180m * (decimal)y.ExpenseScale, 0),
                    "Μεροκάματα για συγκομιδή", "labor", harvestDate.AddHours(-2), harvestId: harvestId,
                    quantity: 3m, unit: "workday",
                    unitPrice: RoundUnit(Math.Round(180m * (decimal)y.ExpenseScale, 0) / 3m),
                    calculationMode: "quantity_times_unit_price", productKind: "labour"), cancellationToken);

                // Posted oil sale: litres × €/litre, ResultYear = agricultural year of sale date.
                // Eleni keeps the mill ticket and records the sale.
                var unitPrice = y.SalePerLitre;
                var sale = Math.Round(oilLitres * unitPrice, 0, MidpointRounding.AwayFromZero);
                written += await UpsertExpense(expenses, Money(
                    NextId(), field.Id, sale, "Πώληση ελαιολάδου", "olive_oil_sale",
                    harvestDate.AddDays(18), type: "income", harvestId: harvestId,
                    quantity: oilLitres, unit: "litre", unitPrice: unitPrice,
                    calculationMode: "quantity_times_unit_price", productKind: "olive_oil",
                    createdByUserId: FamilyUserId), cancellationToken);

                if (storyIndex == 1)
                {
                    var millNoteDate = harvestDate.AddDays(1);
                    written += await UpsertNote(notes, new NoteDocument
                    {
                        Id = NextId(),
                        OwnerUserId = OwnerId,
                        Body = y.Year == 2025
                            ? $"Παραλάβαμε {oilLitres:0.0} L από το ελαιοτριβείο. Κρατάμε το ζυγολόγιο στον φάκελο {y.Year}."
                            : $"Ζυγολόγιο {y.Year}: {oilLitres:0.0} L · απόδοση {y.Yield:0.0}%. Φάκελος με το χαρτί του μύλου.",
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
                Body = "Έλεγξα τους φακέλους 2024–2025. Λείπει ακόμη το χαρτί πώλησης Σεπτεμβρίου από τον αγοραστή — θα το ζητήσω αύριο.",
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
        string? createdByUserId = null) =>
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
            RelatedHarvestId = harvestId,
            SourceType = "manual",
            IdempotencyKey = id,
            CreatedByUserId = createdByUserId ?? OwnerId,
            CreatedAt = when,
            UpdatedAt = when,
            PostedAt = when
        };

    private static decimal RoundUnit(decimal value) =>
        decimal.Round(value, 4, MidpointRounding.AwayFromZero);

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
