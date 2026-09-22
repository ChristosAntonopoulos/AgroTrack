using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Documents.FieldWork;
using OliveLifecycle.Infrastructure.Persistence.Documents.Geospatial;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Three Filiatra parcels for Giorgos (owner), Kostas (συνεργάτης), and Eleni (family).
/// History and upcoming work live in <see cref="ChronologioDemoSeeder"/>;
/// curated live tasks in <see cref="FieldWorkDemoSeeder"/>.
/// </summary>
public static class DemoFarmDataSeeder
{
    public const string OwnerId = "675555555555555555555501";
    public const string ProducerId = "675555555555555555555502";
    public const string FamilyUserId = "675555555555555555555503";

    public static readonly string[] FieldIds =
    [
        "675555555555555555555101",
        "675555555555555555555102",
        "675555555555555555555103",
    ];

    /// <summary>Retired extra grove once owned by Kostas. The household story is the three Filiatra parcels.</summary>
    public const string PartnerOwnedFieldId = "675555555555555555555201";

    /// <summary>Kostas works the trees. He does not see the family's money or harvest books.</summary>
    public static readonly string[] PartnerSeatModules =
    [
        FamilyModules.Fields,
        FamilyModules.Tasks,
        FamilyModules.Photos,
        FamilyModules.Chronologio,
    ];

    /// <summary>Eleni keeps papers, mill tickets, and sales. She does not run field tasks.</summary>
    public static readonly string[] FamilySeatModules =
    [
        FamilyModules.Fields,
        FamilyModules.Photos,
        FamilyModules.Documents,
        FamilyModules.Money,
        FamilyModules.Harvest,
        FamilyModules.Chronologio,
    ];

    public const string OwnerDisplayName = "Γιώργος Παπαδάκης";
    public const string PartnerDisplayName = "Κώστας Μανούσακης";
    public const string FamilyDisplayName = "Ελένη Παπαδάκη";

    /// <summary>24-hex ids shared by tasks, harvests, and money for one grove and year.</summary>
    public static string SeasonTaskId(int year, int fieldNumber, int sequence) =>
        $"67555555555555555556{year % 10}{fieldNumber}{sequence:00}";

    public static string SeasonExecutionId(int year, int fieldNumber, int sequence) =>
        $"67555555555555555558{year % 10}{fieldNumber}{sequence:00}";

    public static string SeasonHarvestId(int year, int fieldNumber) =>
        $"675555555555555555557{year % 10}{fieldNumber}1";

    public static string SeasonMoneyId(int year, int fieldNumber, int sequence) =>
        $"675555555555555555559{year % 10}{fieldNumber}{sequence}";

    private static readonly string[] RetiredFieldIds =
    [
        "675555555555555555555104",
        "675555555555555555555105",
        "6a99a31f0679dcfac8fa6aed",
        "6a99d82fc96dc3bb47459a85",
    ];

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

        var fieldsCol = context.GetCollection<FieldDocument>("fields");
        var junkIds = await FindJunkOwnerFieldIdsAsync(fieldsCol, cancellationToken);
        var extraOwnerFields = await fieldsCol
            .Find(f => f.OwnerId == OwnerId && !FieldIds.Contains(f.Id))
            .Project(f => f.Id)
            .ToListAsync(cancellationToken);

        var wipeIds = junkIds
            .Concat(extraOwnerFields)
            .Concat(FieldIds)
            .Concat(RetiredFieldIds)
            .Append(PartnerOwnedFieldId)
            .Distinct(StringComparer.Ordinal)
            .ToList();
        await RemoveFieldsAsync(context, wipeIds, cancellationToken);
        await context.GetCollection<FinancialTransactionDocument>("financial_transactions")
            .DeleteManyAsync(e => e.OwnerUserId == OwnerId, cancellationToken);
        await context.GetCollection<HarvestRecordDocument>("harvest_records")
            .DeleteManyAsync(h => h.OwnerId == OwnerId, cancellationToken);
        await context.GetCollection<NoteDocument>("notes")
            .DeleteManyAsync(
                n => n.OwnerUserId == OwnerId || n.OwnerUserId == ProducerId || n.OwnerUserId == FamilyUserId,
                cancellationToken);
        await context.GetCollection<UserNotificationDocument>("user_notifications")
            .DeleteManyAsync(
                n => n.UserId == OwnerId || n.UserId == ProducerId || n.UserId == FamilyUserId,
                cancellationToken);
        logger.LogInformation("Cleared demo household data before reseeding the Filiatra story.");

        var now = DateTime.UtcNow;
        var planted = new DateTime(2011, 3, 1, 0, 0, 0, DateTimeKind.Utc);

        var fields = BuildFields(planted, now);
        await fieldsCol.InsertManyAsync(fields, cancellationToken: cancellationToken);

        var lifecycles = BuildLifecycles(now);
        await context.GetCollection<LifecycleDocument>("lifecycles")
            .InsertManyAsync(lifecycles, cancellationToken: cancellationToken);

        logger.LogInformation("Seeded demo farm: {FieldCount} Filiatra fields for owner + partner.", fields.Count);
    }

    /// <summary>
    /// Matches frontend leftover pin heuristic: short single-token names without digits,
    /// plus explicit Draft / incomplete setup statuses.
    /// </summary>
    private static async Task<List<string>> FindJunkOwnerFieldIdsAsync(
        IMongoCollection<FieldDocument> fieldsCol,
        CancellationToken cancellationToken)
    {
        var candidates = await fieldsCol
            .Find(f => f.OwnerId == OwnerId && !FieldIds.Contains(f.Id))
            .ToListAsync(cancellationToken);

        return candidates
            .Where(IsJunkDemoField)
            .Select(f => f.Id)
            .ToList();
    }

    private static bool IsJunkDemoField(FieldDocument field)
    {
        if (field.Status is FieldStatus.Draft
            or FieldStatus.NeedsBoundaryConfirmation
            or FieldStatus.NeedsAreaReview)
        {
            return true;
        }

        var name = (field.Name ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(name)) return true;

        // Leftover short draft names: e.g. "Τεστ", "Grove", "Αγρός"
        return name.Length < 8 && !name.Contains(' ') && !name.Any(char.IsDigit);
    }

    private static async Task<long> RemoveFieldsAsync(
        MongoDbContext context,
        IReadOnlyCollection<string> fieldIds,
        CancellationToken cancellationToken)
    {
        if (fieldIds.Count == 0) return 0;

        var fieldFilter = Builders<FieldDocument>.Filter.In(f => f.Id, fieldIds);
        var deleted = await context.GetCollection<FieldDocument>("fields")
            .DeleteManyAsync(fieldFilter, cancellationToken);
        await context.GetCollection<LifecycleDocument>("lifecycles")
            .DeleteManyAsync(l => fieldIds.Contains(l.FieldId), cancellationToken);
        await context.GetCollection<ActivityDocument>("activities")
            .DeleteManyAsync(a => fieldIds.Contains(a.FieldId), cancellationToken);
        await context.GetCollection<FinancialTransactionDocument>("financial_transactions")
            .DeleteManyAsync(e => fieldIds.Contains(e.FieldId), cancellationToken);
        await context.GetCollection<HarvestRecordDocument>("harvest_records")
            .DeleteManyAsync(h => fieldIds.Contains(h.FieldId), cancellationToken);
        await context.GetCollection<NoteDocument>("notes")
            .DeleteManyAsync(n => n.FieldId != null && fieldIds.Contains(n.FieldId), cancellationToken);
        await context.GetCollection<FieldSpatialProfileDocument>("field_spatial_profiles")
            .DeleteManyAsync(p => fieldIds.Contains(p.FieldId), cancellationToken);
        await context.GetCollection<FieldDailyWeatherSnapshotDocument>("field_daily_weather_snapshots")
            .DeleteManyAsync(s => fieldIds.Contains(s.FieldId), cancellationToken);
        await context.GetCollection<FieldSatelliteObservationDocument>("field_satellite_observations")
            .DeleteManyAsync(o => fieldIds.Contains(o.FieldId), cancellationToken);
        await context.GetCollection<FieldEnvironmentalAlertDocument>("field_environmental_alerts")
            .DeleteManyAsync(a => fieldIds.Contains(a.FieldId), cancellationToken);
        await context.GetCollection<GeospatialProcessingJobDocument>("geospatial_processing_jobs")
            .DeleteManyAsync(j => j.FieldId != null && fieldIds.Contains(j.FieldId), cancellationToken);
        await context.GetCollection<FieldTaskDocument>("field_tasks")
            .DeleteManyAsync(t => fieldIds.Contains(t.FieldId), cancellationToken);
        await context.GetCollection<TaskProposalDocument>("task_proposals")
            .DeleteManyAsync(t => fieldIds.Contains(t.FieldId), cancellationToken);
        await context.GetCollection<TaskExecutionDocument>("task_executions")
            .DeleteManyAsync(e => fieldIds.Contains(e.FieldId), cancellationToken);
        await context.GetCollection<MediaAttachmentDocument>("media_attachments")
            .DeleteManyAsync(m => fieldIds.Contains(m.FieldId), cancellationToken);
        return deleted.DeletedCount;
    }

    private static List<FieldMembershipDocument> Memberships(DateTime created) =>
    [
        new()
        {
            UserId = OwnerId,
            Role = "Admin",
            Modules = ["fields", "tasks", "photos", "documents", "money", "chronologio", "harvest"],
            AccessLevel = "work",
            Status = "active",
            DisplayName = OwnerDisplayName,
            Email = "owner@olivefarm.com",
            CreatedAt = created,
        },
        new()
        {
            UserId = ProducerId,
            Role = "Partner",
            Modules = PartnerSeatModules.ToList(),
            AccessLevel = "work",
            Status = "active",
            InvitedBy = OwnerId,
            DisplayName = PartnerDisplayName,
            Email = "producer1@olivefarm.com",
            CreatedAt = created,
        },
        new()
        {
            UserId = FamilyUserId,
            Role = "Family",
            Modules = FamilySeatModules.ToList(),
            AccessLevel = FamilyAccessLevels.Work,
            Status = "active",
            InvitedBy = OwnerId,
            DisplayName = FamilyDisplayName,
            Email = "family@olivefarm.com",
            CreatedAt = created,
        },
    ];

    private static GeoJsonPointDocument Center(double latitude, double longitude) =>
        new()
        {
            Type = "Point",
            Coordinates = [longitude, latitude],
        };

    private static GeoJsonPolygonDocument Polygon(double[][] ring) =>
        new()
        {
            Type = "Polygon",
            Coordinates = [ring.Select(p => new List<double> { p[0], p[1] }).ToList()],
        };

    private static List<FieldDocument> BuildFields(DateTime created, DateTime updated) =>
    [
        new()
        {
            Id = FieldIds[0],
            OwnerId = OwnerId,
            Name = "Φιλιατρών 088",
            Location = new LocationDocument { Latitude = 37.193787613627592, Longitude = 21.593640833820832 },
            CenterPoint = Center(37.193787613627592, 21.593640833820832),
            Boundary = Polygon(
            [
                [21.593982799448597, 37.193400347668451],
                [21.594283192784363, 37.193665291370195],
                [21.593854059447583, 37.193840495565475],
                [21.593703862779677, 37.193737937061478],
                [21.593489296111287, 37.193797762872407],
                [21.5936180361123, 37.193908867824071],
                [21.593215723609074, 37.194071251690133],
                [21.592979700273794, 37.193878954968561],
                [21.593982799448597, 37.193400347668451],
            ]),
            Area = 3191.4388526537591,
            AppMeasuredAreaSqm = 3191.4388526537591,
            Variety = "Μεγαρίτικη",
            TreeAge = 28,
            TreeCount = 92,
            GroundType = "Loam",
            SoilType = "Loam",
            IrrigationStatus = true,
            IrrigationType = "Drip irrigation",
            Slope = "Slight slope",
            CurrentLifecycleYear = "high",
            CurrentLifecycleStage = OliveLifecycleStage.FruitGrowth,
            Memberships = Memberships(created),
            Status = FieldStatus.Active,
            CropType = "Olive",
            LocationText = "Φιλιατρών, Μεσσηνία",
            Color = "#E8C547",
            AccessNotes = "Είσοδος από το χωματόδρομο βόρεια του ΚΑΕΚ. Χώρος για τρακτέρ δίπλα στο κανάλι.",
            GreekCadastre = new GreekCadastreInfoDocument
            {
                Kaek = "362621142088/0/0",
                NormalizedKaek = "362621142088/0/0",
                LocationFromCadastre = "ΦΙΛΙΑΤΡΩΝ, 11206, Μεσσηνίας",
                Prefecture = "Μεσσηνίας",
                Municipality = "Φιλιατρών",
                Source = "Manual",
                VerificationStatus = "Confirmed",
            },
            CreatedAt = created,
            UpdatedAt = updated,
        },
        new()
        {
            Id = FieldIds[1],
            OwnerId = OwnerId,
            Name = "Φιλιατρών 089",
            Location = new LocationDocument { Latitude = 37.193794307275581, Longitude = 21.593644047696579 },
            CenterPoint = Center(37.193794307275581, 21.593644047696579),
            Boundary = Polygon(
            [
                [21.592995654045499, 37.193912890701618],
                [21.593961204053326, 37.193412917158163],
                [21.594202591555273, 37.193626581470753],
                [21.593875377385952, 37.193853064981909],
                [21.593719816551342, 37.193724866851497],
                [21.593553527383349, 37.193797512485474],
                [21.593617897383876, 37.193917163965502],
                [21.593226313214025, 37.19410946058975],
                [21.592995654045499, 37.193912890701618],
            ]),
            Area = 2968.439166266176,
            AppMeasuredAreaSqm = 2968.439166266176,
            Variety = "Κορωνέικη",
            TreeAge = 18,
            TreeCount = 58,
            GroundType = "Clay Loam",
            SoilType = "Clay Loam",
            IrrigationStatus = true,
            IrrigationType = "Drip irrigation",
            Slope = "Flat",
            CurrentLifecycleYear = "high",
            CurrentLifecycleStage = OliveLifecycleStage.FruitGrowth,
            Memberships = Memberships(created),
            Status = FieldStatus.Active,
            CropType = "Olive",
            LocationText = "Φιλιατρών, Μεσσηνία",
            Color = "#B54422",
            AccessNotes = "Ίδια είσοδος με το 088. Τα νεότερα δέντρα είναι στην κάτω πλευρά.",
            GreekCadastre = new GreekCadastreInfoDocument
            {
                Kaek = "362621142089/0/0",
                NormalizedKaek = "362621142089/0/0",
                LocationFromCadastre = "ΦΙΛΙΑΤΡΩΝ, 11206, Μεσσηνίας",
                Prefecture = "Μεσσηνίας",
                Municipality = "Φιλιατρών",
                Source = "Manual",
                VerificationStatus = "Confirmed",
            },
            CreatedAt = created,
            UpdatedAt = updated,
        },
        new()
        {
            Id = FieldIds[2],
            OwnerId = OwnerId,
            Name = "Φιλιατρών 090",
            Location = new LocationDocument { Latitude = 37.19412, Longitude = 21.59405 },
            CenterPoint = Center(37.19412, 21.59405),
            Boundary = Polygon(
            [
                [21.59420, 37.19395],
                [21.59455, 37.19415],
                [21.59435, 37.19435],
                [21.59395, 37.19428],
                [21.59380, 37.19405],
                [21.59420, 37.19395],
            ]),
            Area = 2480.0,
            AppMeasuredAreaSqm = 2480.0,
            Variety = "Καλαμών",
            TreeAge = 22,
            TreeCount = 64,
            GroundType = "Sandy Loam",
            SoilType = "Sandy Loam",
            IrrigationStatus = true,
            IrrigationType = "Drip irrigation",
            Slope = "Slight slope",
            CurrentLifecycleYear = "high",
            CurrentLifecycleStage = OliveLifecycleStage.FruitGrowth,
            Memberships = Memberships(created),
            Status = FieldStatus.Active,
            CropType = "Olive",
            LocationText = "Φιλιατρών, Μεσσηνία",
            Color = "#5B7C4D",
            AccessNotes = "Μικρότερο αγροτεμάχιο ανατολικά του 089. Πρόσβαση από το ίδιο χωματόδρομο.",
            GreekCadastre = new GreekCadastreInfoDocument
            {
                Kaek = "362621142090/0/0",
                NormalizedKaek = "362621142090/0/0",
                LocationFromCadastre = "ΦΙΛΙΑΤΡΩΝ, 11206, Μεσσηνίας",
                Prefecture = "Μεσσηνίας",
                Municipality = "Φιλιατρών",
                Source = "Manual",
                VerificationStatus = "Confirmed",
            },
            CreatedAt = created,
            UpdatedAt = updated,
        },
    ];

    private static List<LifecycleDocument> BuildLifecycles(DateTime now) =>
    [
        new()
        {
            Id = "675555555555555555552001",
            FieldId = FieldIds[0],
            CurrentYear = "high",
            CurrentStage = OliveLifecycleStage.FruitGrowth,
            CycleStartDate = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
            LastProgressionDate = now.AddDays(-12),
            CreatedAt = new DateTime(2023, 2, 1, 0, 0, 0, DateTimeKind.Utc),
            UpdatedAt = now,
        },
        new()
        {
            Id = "675555555555555555552002",
            FieldId = FieldIds[1],
            CurrentYear = "high",
            CurrentStage = OliveLifecycleStage.FruitGrowth,
            CycleStartDate = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
            LastProgressionDate = now.AddDays(-10),
            CreatedAt = new DateTime(2023, 2, 1, 0, 0, 0, DateTimeKind.Utc),
            UpdatedAt = now,
        },
        new()
        {
            Id = "675555555555555555552003",
            FieldId = FieldIds[2],
            CurrentYear = "high",
            CurrentStage = OliveLifecycleStage.FruitGrowth,
            CycleStartDate = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
            LastProgressionDate = now.AddDays(-8),
            CreatedAt = new DateTime(2023, 2, 1, 0, 0, 0, DateTimeKind.Utc),
            UpdatedAt = now,
        },
    ];
}
