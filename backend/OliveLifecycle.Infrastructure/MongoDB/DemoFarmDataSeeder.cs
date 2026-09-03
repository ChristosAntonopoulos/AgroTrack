using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Documents.Geospatial;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Demo login accounts stay seeded. The original canned farm plots are removed so
/// owner/producer views only show fields the user created.
/// </summary>
public static class DemoFarmDataSeeder
{
    public const string OwnerId = "675555555555555555555501";
    public const string ProducerId = "675555555555555555555502";

    /// <summary>
    /// Original canned demo plots (North Grove through Central Meadow). User-created
    /// fields use generated ids and are never touched.
    /// </summary>
    private static readonly string[] RetiredDemoFieldIds =
    [
        "675555555555555555555101",
        "675555555555555555555102",
        "675555555555555555555103",
        "675555555555555555555104",
        "675555555555555555555105",
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

        var removed = await RemoveFieldsAsync(context, RetiredDemoFieldIds, cancellationToken);
        if (removed > 0)
        {
            logger.LogInformation("Removed {Count} retired demo fields and their related records.", removed);
        }
        else
        {
            logger.LogInformation("No retired demo fields left to remove.");
        }
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
}
