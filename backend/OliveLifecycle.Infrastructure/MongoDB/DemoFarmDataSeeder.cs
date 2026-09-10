using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Documents.Geospatial;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Two Filiatra parcels for Giorgos (owner) and Kostas (partner).
/// History and upcoming work live in <see cref="ChronologioDemoSeeder"/>.
/// </summary>
public static class DemoFarmDataSeeder
{
    public const string OwnerId = "675555555555555555555501";
    public const string ProducerId = "675555555555555555555502";

    public static readonly string[] FieldIds =
    [
        "675555555555555555555101",
        "675555555555555555555102",
    ];

    private static readonly string[] RetiredFieldIds =
    [
        "675555555555555555555103",
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

        var retiredRemoved = await RemoveFieldsAsync(context, RetiredFieldIds, cancellationToken);
        if (retiredRemoved > 0)
        {
            logger.LogInformation("Removed {Count} retired demo fields.", retiredRemoved);
        }

        var fieldsCol = context.GetCollection<FieldDocument>("fields");
        var existingKept = await fieldsCol
            .Find(f => FieldIds.Contains(f.Id))
            .ToListAsync(cancellationToken);

        var reseed = string.Equals(configuration["DemoAccounts:ReseedFarmData"], "true", StringComparison.OrdinalIgnoreCase);
        var looksCurrent = existingKept.Count == FieldIds.Length
            && existingKept.All(f => f.Name.Contains("Φιλιατρών", StringComparison.Ordinal));

        if (looksCurrent && !reseed)
        {
            logger.LogInformation("Demo farm data already present; skipping field seed.");
            return;
        }

        var extraOwnerFields = await fieldsCol
            .Find(f => f.OwnerId == OwnerId && !FieldIds.Contains(f.Id))
            .Project(f => f.Id)
            .ToListAsync(cancellationToken);
        if (extraOwnerFields.Count > 0)
        {
            var extraRemoved = await RemoveFieldsAsync(context, extraOwnerFields, cancellationToken);
            logger.LogInformation("Removed {Count} extra fields for the demo owner.", extraRemoved);
        }

        if (existingKept.Count > 0)
        {
            await RemoveFieldsAsync(context, FieldIds, cancellationToken);
            logger.LogInformation("Cleared existing demo farm data for reseed.");
        }

        var now = DateTime.UtcNow;
        var planted = new DateTime(2011, 3, 1, 0, 0, 0, DateTimeKind.Utc);

        var fields = BuildFields(planted, now);
        await fieldsCol.InsertManyAsync(fields, cancellationToken: cancellationToken);

        var lifecycles = BuildLifecycles(now);
        await context.GetCollection<LifecycleDocument>("lifecycles")
            .InsertManyAsync(lifecycles, cancellationToken: cancellationToken);

        logger.LogInformation("Seeded demo farm: {FieldCount} Filiatra fields for owner + partner.", fields.Count);
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
        await context.GetCollection<TaskDocument>("tasks")
            .DeleteManyAsync(t => fieldIds.Contains(t.FieldId), cancellationToken);
        await context.GetCollection<ActivityDocument>("activities")
            .DeleteManyAsync(a => fieldIds.Contains(a.FieldId), cancellationToken);
        await context.GetCollection<FinancialEntryDocument>("financial_entries")
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
        return deleted.DeletedCount;
    }

    private static List<FieldMembershipDocument> Memberships(DateTime created) =>
    [
        new()
        {
            UserId = OwnerId,
            Capacities = ["own", "work"],
            Status = "active",
            CreatedAt = created,
        },
        new()
        {
            UserId = ProducerId,
            Capacities = ["work"],
            Status = "active",
            InvitedBy = OwnerId,
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
            Name = "Φιλιατρών 088 — Μεγαρίτικη",
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
            AssignedProducerIds = [ProducerId],
            Memberships = Memberships(created),
            Status = FieldStatus.Active,
            CropType = "Olive",
            LocationText = "Φιλιατρών, Μεσσηνία",
            Color = "#2F6B4F",
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
            Name = "Φιλιατρών 089 — Κορωνέικη",
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
            AssignedProducerIds = [ProducerId],
            Memberships = Memberships(created),
            Status = FieldStatus.Active,
            CropType = "Olive",
            LocationText = "Φιλιατρών, Μεσσηνία",
            Color = "#3D6EA8",
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
    ];
}
