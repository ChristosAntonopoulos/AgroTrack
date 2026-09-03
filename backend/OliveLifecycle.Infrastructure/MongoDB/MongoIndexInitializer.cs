using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Documents.Geospatial;

namespace OliveLifecycle.Infrastructure.MongoDB;

public class MongoIndexInitializer : IHostedService
{
    private readonly MongoDbContext _context;
    private readonly ILogger<MongoIndexInitializer> _logger;

    public MongoIndexInitializer(MongoDbContext context, ILogger<MongoIndexInitializer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            var users = _context.GetCollection<UserDocument>("users");
            users.Indexes.CreateOne(
                new CreateIndexModel<UserDocument>(
                    Builders<UserDocument>.IndexKeys.Ascending(u => u.Email),
                    new CreateIndexOptions { Unique = true }));

            var fields = _context.GetCollection<FieldDocument>("fields");
            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys.Ascending(f => f.OwnerId)));
            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys.Ascending(f => f.AssignedProducerIds)));
            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys.Ascending("memberships.userId")));

            var invites = _context.GetCollection<FieldInviteDocument>("field_invites");
            invites.Indexes.CreateOne(new CreateIndexModel<FieldInviteDocument>(
                Builders<FieldInviteDocument>.IndexKeys.Ascending(i => i.Token),
                new CreateIndexOptions { Unique = true }));
            invites.Indexes.CreateOne(new CreateIndexModel<FieldInviteDocument>(
                Builders<FieldInviteDocument>.IndexKeys.Ascending(i => i.FieldId)));

            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys.Ascending(f => f.Status)));
            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys.Ascending(f => f.CropType)));
            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys.Ascending("greekCadastre.normalizedKaek")));
            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys.Descending(f => f.CreatedAt)));
            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys.Geo2DSphere("centerPoint")));
            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys.Geo2DSphere("boundary")));

            var tasks = _context.GetCollection<TaskDocument>("tasks");
            tasks.Indexes.CreateOne(new CreateIndexModel<TaskDocument>(
                Builders<TaskDocument>.IndexKeys.Ascending(t => t.FieldId)));
            tasks.Indexes.CreateOne(new CreateIndexModel<TaskDocument>(
                Builders<TaskDocument>.IndexKeys.Ascending(t => t.AssignedTo)));
            tasks.Indexes.CreateOne(new CreateIndexModel<TaskDocument>(
                Builders<TaskDocument>.IndexKeys.Ascending(t => t.Status)));
            tasks.Indexes.CreateOne(new CreateIndexModel<TaskDocument>(
                Builders<TaskDocument>.IndexKeys.Ascending(t => t.ScheduledStart)));

            var lifecycles = _context.GetCollection<LifecycleDocument>("lifecycles");
            lifecycles.Indexes.CreateOne(
                new CreateIndexModel<LifecycleDocument>(
                    Builders<LifecycleDocument>.IndexKeys.Ascending(l => l.FieldId),
                    new CreateIndexOptions { Unique = true }));

            var activities = _context.GetCollection<ActivityDocument>("activities");
            activities.Indexes.CreateOne(new CreateIndexModel<ActivityDocument>(
                Builders<ActivityDocument>.IndexKeys
                    .Ascending(a => a.FieldId)
                    .Descending(a => a.Timestamp)));

            var templates = _context.GetCollection<TaskTemplateDocument>("task_templates");
            templates.Indexes.CreateOne(new CreateIndexModel<TaskTemplateDocument>(
                Builders<TaskTemplateDocument>.IndexKeys.Ascending(t => t.Type),
                new CreateIndexOptions { Unique = true }));

            var ministryReads = _context.GetCollection<MinistryNotificationReadDocument>("ministry_notification_reads");
            ministryReads.Indexes.CreateOne(new CreateIndexModel<MinistryNotificationReadDocument>(
                Builders<MinistryNotificationReadDocument>.IndexKeys
                    .Ascending(r => r.UserId)
                    .Ascending(r => r.NotificationId),
                new CreateIndexOptions { Unique = true }));

            var harvests = _context.GetCollection<HarvestRecordDocument>("harvest_records");
            harvests.Indexes.CreateOne(new CreateIndexModel<HarvestRecordDocument>(
                Builders<HarvestRecordDocument>.IndexKeys.Ascending(h => h.OwnerId)));
            harvests.Indexes.CreateOne(new CreateIndexModel<HarvestRecordDocument>(
                Builders<HarvestRecordDocument>.IndexKeys.Ascending(h => h.FieldId)));

            EnsureGeospatialIndexes();

            _logger.LogInformation("MongoDB indexes ensured.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "MongoDB index creation encountered an issue (indexes may already exist).");
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private void EnsureGeospatialIndexes()
    {
        var profiles = _context.GetCollection<FieldSpatialProfileDocument>("field_spatial_profiles");
        profiles.Indexes.CreateOne(new CreateIndexModel<FieldSpatialProfileDocument>(
            Builders<FieldSpatialProfileDocument>.IndexKeys.Ascending(p => p.FieldId),
            new CreateIndexOptions { Unique = true }));

        var weatherCache = _context.GetCollection<WeatherCacheLocationDocument>("weather_cache_locations");
        weatherCache.Indexes.CreateOne(new CreateIndexModel<WeatherCacheLocationDocument>(
            Builders<WeatherCacheLocationDocument>.IndexKeys.Ascending(w => w.GridKey),
            new CreateIndexOptions { Unique = true }));
        weatherCache.Indexes.CreateOne(new CreateIndexModel<WeatherCacheLocationDocument>(
            Builders<WeatherCacheLocationDocument>.IndexKeys.Ascending(w => w.FetchedAt)));

        // Unique (fieldId, date) is what makes repeated snapshot jobs idempotent.
        var snapshots = _context.GetCollection<FieldDailyWeatherSnapshotDocument>("field_daily_weather_snapshots");
        snapshots.Indexes.CreateOne(new CreateIndexModel<FieldDailyWeatherSnapshotDocument>(
            Builders<FieldDailyWeatherSnapshotDocument>.IndexKeys
                .Ascending(s => s.FieldId)
                .Ascending(s => s.Date),
            new CreateIndexOptions { Unique = true }));

        var observations = _context.GetCollection<FieldSatelliteObservationDocument>("field_satellite_observations");
        observations.Indexes.CreateOne(new CreateIndexModel<FieldSatelliteObservationDocument>(
            Builders<FieldSatelliteObservationDocument>.IndexKeys
                .Ascending(o => o.FieldId)
                .Descending(o => o.ObservationDate)));

        // Serves the usable-only lookups behind change analysis and map overlays.
        observations.Indexes.CreateOne(new CreateIndexModel<FieldSatelliteObservationDocument>(
            Builders<FieldSatelliteObservationDocument>.IndexKeys
                .Ascending(o => o.FieldId)
                .Ascending(o => o.IsUsable)
                .Descending(o => o.ObservationDate)));

        // One observation per field and scene, so repeated discovery runs cannot
        // insert a duplicate for imagery that has already been processed.
        observations.Indexes.CreateOne(new CreateIndexModel<FieldSatelliteObservationDocument>(
            Builders<FieldSatelliteObservationDocument>.IndexKeys
                .Ascending(o => o.FieldId)
                .Ascending(o => o.CatalogItemId),
            new CreateIndexOptions { Unique = true }));

        // Supports the retention sweep that prunes rasters past the storage window.
        observations.Indexes.CreateOne(new CreateIndexModel<FieldSatelliteObservationDocument>(
            Builders<FieldSatelliteObservationDocument>.IndexKeys.Ascending(o => o.ObservationDate)));

        var alerts = _context.GetCollection<FieldEnvironmentalAlertDocument>("field_environmental_alerts");
        alerts.Indexes.CreateOne(new CreateIndexModel<FieldEnvironmentalAlertDocument>(
            Builders<FieldEnvironmentalAlertDocument>.IndexKeys.Ascending(a => a.DedupKey),
            new CreateIndexOptions { Unique = true }));
        alerts.Indexes.CreateOne(new CreateIndexModel<FieldEnvironmentalAlertDocument>(
            Builders<FieldEnvironmentalAlertDocument>.IndexKeys
                .Ascending(a => a.FieldId)
                .Descending(a => a.CreatedAt)));

        var fires = _context.GetCollection<FireDetectionDocument>("fire_detections");
        fires.Indexes.CreateOne(new CreateIndexModel<FireDetectionDocument>(
            Builders<FireDetectionDocument>.IndexKeys.Descending(f => f.DetectedAt)));

        var natura = _context.GetCollection<NaturaSiteDocument>("natura_sites");
        natura.Indexes.CreateOne(new CreateIndexModel<NaturaSiteDocument>(
            Builders<NaturaSiteDocument>.IndexKeys.Ascending(n => n.SiteCode),
            new CreateIndexOptions { Unique = true }));

        var health = _context.GetCollection<DataSourceHealthDocument>("data_source_health");
        health.Indexes.CreateOne(new CreateIndexModel<DataSourceHealthDocument>(
            Builders<DataSourceHealthDocument>.IndexKeys.Ascending(h => h.SourceId),
            new CreateIndexOptions { Unique = true }));

        var jobs = _context.GetCollection<GeospatialProcessingJobDocument>("geospatial_processing_jobs");
        jobs.Indexes.CreateOne(new CreateIndexModel<GeospatialProcessingJobDocument>(
            Builders<GeospatialProcessingJobDocument>.IndexKeys.Ascending(j => j.IdempotencyKey),
            new CreateIndexOptions { Unique = true, Sparse = true }));
        jobs.Indexes.CreateOne(new CreateIndexModel<GeospatialProcessingJobDocument>(
            Builders<GeospatialProcessingJobDocument>.IndexKeys
                .Ascending(j => j.FieldId)
                .Ascending(j => j.JobType)
                .Ascending(j => j.Status)));
    }
}
