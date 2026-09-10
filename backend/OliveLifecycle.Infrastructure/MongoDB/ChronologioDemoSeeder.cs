using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Multi-year Living Timeline for Giorgos and Kostas on the two Filiatra parcels.
/// Completed work stops at "today". Harvest 2026 and prep sit in the future.
/// Legacy TaskDocument ("tasks") rows are intentionally skipped; FieldWork owns tasks.
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

        var expenses = context.GetCollection<FinancialTransactionDocument>("financial_transactions");
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
        IMongoCollection<FinancialTransactionDocument> expenses,
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

            var fertDate = Utc(y.Year, 3, isNorth ? 8 : 14, 10, 0);
            if (fertDate <= today)
            {
                var fertilizerAmount = Math.Round(58m * (decimal)y.ExpenseScale, 0);
                written += await UpsertExpense(expenses, Money(
                    NextId(), field.Id, fertilizerAmount,
                    "Λίπασμα και μεταφορά", "fertilizers", fertDate,
                    quantity: 50m, unit: "kilogram", unitPrice: RoundUnit(fertilizerAmount / 50m),
                    calculationMode: "quantity_and_total", productKind: "fertilizer"), cancellationToken);
            }

            var sprayDate = Utc(y.Year, 5, isNorth ? 6 : 11, 7, 45);
            if (sprayDate <= today)
            {
                written += await UpsertExpense(expenses, Money(
                    NextId(), field.Id, Math.Round(42m * (decimal)y.ExpenseScale, 0),
                    "Δολωματικός ψεκασμός δάκου", "plant_protection", sprayDate), cancellationToken);
            }

            var irrigDate = Utc(y.Year, 7, isNorth ? 9 : 16, 6, 20);
            if (irrigDate <= today)
            {
                written += await UpsertExpense(expenses, Money(
                    NextId(), field.Id, Math.Round(22m * (decimal)y.ExpenseScale, 0),
                    "Πετρέλαιο για αντλία άρδευσης", "fuel_and_energy", irrigDate,
                    quantity: 20m, unit: "litre",
                    unitPrice: RoundUnit(Math.Round(22m * (decimal)y.ExpenseScale, 0) / 20m),
                    calculationMode: "quantity_times_unit_price", productKind: "fuel"), cancellationToken);
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

                written += await UpsertExpense(expenses, Money(
                    NextId(), field.Id, Math.Round(95m * (decimal)y.ExpenseScale, 0),
                    "Κόστος ελαιοτριβείου", "mill", harvestDate.AddHours(5), harvestId: harvestId), cancellationToken);

                written += await UpsertExpense(expenses, Money(
                    NextId(), field.Id, Math.Round(180m * (decimal)y.ExpenseScale, 0),
                    "Μεροκάματα για συγκομιδή", "labor", harvestDate.AddHours(-2), harvestId: harvestId,
                    quantity: 3m, unit: "workday",
                    unitPrice: RoundUnit(Math.Round(180m * (decimal)y.ExpenseScale, 0) / 3m),
                    calculationMode: "quantity_times_unit_price", productKind: "labour"), cancellationToken);

                var sale = Math.Round((decimal)(oilKg * y.SalePerKg), 0);
                written += await UpsertExpense(expenses, Money(
                    NextId(), field.Id, sale, "Πώληση ελαιολάδου", "olive_oil_sale",
                    harvestDate.AddDays(18), type: "income", harvestId: harvestId,
                    calculationMode: "total_only", productKind: "olive_oil"), cancellationToken);
            }
        }

        written += await SeedCurrentAndUpcomingAsync(
            field, isNorth, NextId, expenses, notes, activities, cancellationToken);

        return written;
    }

    private static async Task<int> SeedCurrentAndUpcomingAsync(
        FieldDocument field,
        bool isNorth,
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
            Utc(2026, 9, 7, 8, 15),
            quantity: 15m, unit: "litre", unitPrice: 1.87m,
            calculationMode: "quantity_times_unit_price", productKind: "fuel"), cancellationToken);

        if (isNorth)
        {
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
        string? productKind = null) =>
        new()
        {
            Id = id,
            OwnerUserId = OwnerId,
            Type = type,
            Status = "posted",
            Amount = amount,
            Currency = "EUR",
            OccurredOn = when,
            ResultYear = when.Year,
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
            CreatedByUserId = OwnerId,
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
