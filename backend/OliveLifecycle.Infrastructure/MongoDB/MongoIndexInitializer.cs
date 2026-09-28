using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Documents.FieldWork;
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
            users.Indexes.CreateOne(
                new CreateIndexModel<UserDocument>(
                    Builders<UserDocument>.IndexKeys.Ascending(u => u.PasswordResetTokenHash),
                    new CreateIndexOptions { Sparse = true, Name = "ix_users_passwordResetTokenHash" }));

            var fields = _context.GetCollection<FieldDocument>("fields");
            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys.Ascending(f => f.OwnerId)));
            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys.Ascending("memberships.userId")));
            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys
                    .Ascending("memberships.userId")
                    .Ascending("memberships.status"),
                new CreateIndexOptions { Name = "ix_fields_memberships_userId_status" }));
            fields.Indexes.CreateOne(new CreateIndexModel<FieldDocument>(
                Builders<FieldDocument>.IndexKeys.Ascending("memberships.role"),
                new CreateIndexOptions { Name = "ix_fields_memberships_role", Sparse = true }));

            var invites = _context.GetCollection<FieldInviteDocument>("field_invites");
            invites.Indexes.CreateOne(new CreateIndexModel<FieldInviteDocument>(
                Builders<FieldInviteDocument>.IndexKeys.Ascending(i => i.Token),
                new CreateIndexOptions { Unique = true }));
            invites.Indexes.CreateOne(new CreateIndexModel<FieldInviteDocument>(
                Builders<FieldInviteDocument>.IndexKeys.Ascending(i => i.FieldId)));
            invites.Indexes.CreateOne(new CreateIndexModel<FieldInviteDocument>(
                Builders<FieldInviteDocument>.IndexKeys.Ascending(i => i.Code),
                new CreateIndexOptions { Unique = true, Sparse = true, Name = "ix_field_invites_code" }));

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
            activities.Indexes.CreateOne(new CreateIndexModel<ActivityDocument>(
                Builders<ActivityDocument>.IndexKeys
                    .Ascending(a => a.ActorUserId)
                    .Descending(a => a.Timestamp)));

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

            var financialTransactions = _context.GetCollection<FinancialTransactionDocument>("financial_transactions");
            financialTransactions.Indexes.CreateOne(new CreateIndexModel<FinancialTransactionDocument>(
                Builders<FinancialTransactionDocument>.IndexKeys
                    .Ascending(e => e.OwnerUserId)
                    .Ascending(e => e.ResultYear)
                    .Ascending(e => e.Status)));
            financialTransactions.Indexes.CreateOne(new CreateIndexModel<FinancialTransactionDocument>(
                Builders<FinancialTransactionDocument>.IndexKeys
                    .Ascending(e => e.FieldId)
                    .Ascending(e => e.ResultYear)
                    .Ascending(e => e.Status)));
            financialTransactions.Indexes.CreateOne(new CreateIndexModel<FinancialTransactionDocument>(
                Builders<FinancialTransactionDocument>.IndexKeys.Ascending(e => e.RelatedTaskId),
                new CreateIndexOptions { Sparse = true }));
            financialTransactions.Indexes.CreateOne(new CreateIndexModel<FinancialTransactionDocument>(
                Builders<FinancialTransactionDocument>.IndexKeys.Ascending(e => e.RelatedHarvestId),
                new CreateIndexOptions { Sparse = true }));
            financialTransactions.Indexes.CreateOne(new CreateIndexModel<FinancialTransactionDocument>(
                Builders<FinancialTransactionDocument>.IndexKeys.Descending(e => e.OccurredOn)));
            financialTransactions.Indexes.CreateOne(new CreateIndexModel<FinancialTransactionDocument>(
                Builders<FinancialTransactionDocument>.IndexKeys
                    .Ascending(e => e.OwnerUserId)
                    .Ascending(e => e.IdempotencyKey),
                new CreateIndexOptions { Unique = true }));
            financialTransactions.Indexes.CreateOne(new CreateIndexModel<FinancialTransactionDocument>(
                Builders<FinancialTransactionDocument>.IndexKeys.Ascending(e => e.CreatedByUserId)));

            var serviceCategories = _context.GetCollection<ServiceCategoryDocument>("service_categories");
            serviceCategories.Indexes.CreateOne(new CreateIndexModel<ServiceCategoryDocument>(
                Builders<ServiceCategoryDocument>.IndexKeys.Ascending(c => c.Slug),
                new CreateIndexOptions { Unique = true }));
            serviceCategories.Indexes.CreateOne(new CreateIndexModel<ServiceCategoryDocument>(
                Builders<ServiceCategoryDocument>.IndexKeys.Ascending(c => c.SortOrder)));

            var providerProfiles = _context.GetCollection<ServiceProviderProfileDocument>("service_provider_profiles");
            providerProfiles.Indexes.CreateOne(new CreateIndexModel<ServiceProviderProfileDocument>(
                Builders<ServiceProviderProfileDocument>.IndexKeys.Ascending(p => p.UserId),
                new CreateIndexOptions { Unique = true }));
            providerProfiles.Indexes.CreateOne(new CreateIndexModel<ServiceProviderProfileDocument>(
                Builders<ServiceProviderProfileDocument>.IndexKeys.Geo2DSphere("baseLocation")));
            providerProfiles.Indexes.CreateOne(new CreateIndexModel<ServiceProviderProfileDocument>(
                Builders<ServiceProviderProfileDocument>.IndexKeys
                    .Ascending(p => p.IsListed)
                    .Ascending(p => p.IsPaused)));

            var contactRequests = _context.GetCollection<ServiceContactRequestDocument>("service_contact_requests");
            contactRequests.Indexes.CreateOne(new CreateIndexModel<ServiceContactRequestDocument>(
                Builders<ServiceContactRequestDocument>.IndexKeys.Ascending(r => r.ProviderUserId).Descending(r => r.CreatedAt)));
            contactRequests.Indexes.CreateOne(new CreateIndexModel<ServiceContactRequestDocument>(
                Builders<ServiceContactRequestDocument>.IndexKeys.Ascending(r => r.RequesterUserId).Descending(r => r.CreatedAt)));

            var userNotifications = _context.GetCollection<UserNotificationDocument>("user_notifications");
            userNotifications.Indexes.CreateOne(new CreateIndexModel<UserNotificationDocument>(
                Builders<UserNotificationDocument>.IndexKeys.Ascending(n => n.UserId).Descending(n => n.CreatedAt)));

            var savedContacts = _context.GetCollection<SavedContactDocument>("saved_contacts");
            savedContacts.Indexes.CreateOne(new CreateIndexModel<SavedContactDocument>(
                Builders<SavedContactDocument>.IndexKeys.Ascending(c => c.OwnerUserId).Ascending(c => c.DisplayName)));
            savedContacts.Indexes.CreateOne(new CreateIndexModel<SavedContactDocument>(
                Builders<SavedContactDocument>.IndexKeys.Ascending(c => c.OwnerUserId).Ascending(c => c.FieldIds)));

            var notes = _context.GetCollection<NoteDocument>("notes");
            notes.Indexes.CreateOne(new CreateIndexModel<NoteDocument>(
                Builders<NoteDocument>.IndexKeys
                    .Ascending(n => n.OwnerUserId)
                    .Descending(n => n.Pinned)
                    .Descending(n => n.UpdatedAt)));
            notes.Indexes.CreateOne(new CreateIndexModel<NoteDocument>(
                Builders<NoteDocument>.IndexKeys
                    .Ascending(n => n.OwnerUserId)
                    .Ascending(n => n.FieldId)
                    .Descending(n => n.OccurredAt)));

            var mediaAttachments = _context.GetCollection<MediaAttachmentDocument>("media_attachments");
            mediaAttachments.Indexes.CreateOne(new CreateIndexModel<MediaAttachmentDocument>(
                Builders<MediaAttachmentDocument>.IndexKeys
                    .Ascending(m => m.OwnerType)
                    .Ascending(m => m.OwnerId)
                    .Ascending(m => m.CreatedAt)));
            mediaAttachments.Indexes.CreateOne(new CreateIndexModel<MediaAttachmentDocument>(
                Builders<MediaAttachmentDocument>.IndexKeys
                    .Ascending(m => m.FieldId)
                    .Descending(m => m.CreatedAt)));
            mediaAttachments.Indexes.CreateOne(new CreateIndexModel<MediaAttachmentDocument>(
                Builders<MediaAttachmentDocument>.IndexKeys
                    .Ascending(m => m.FieldId)
                    .Descending(m => m.CapturedAt)));
            mediaAttachments.Indexes.CreateOne(new CreateIndexModel<MediaAttachmentDocument>(
                Builders<MediaAttachmentDocument>.IndexKeys
                    .Ascending(m => m.ContentHash)
                    .Ascending(m => m.FieldId)));
            mediaAttachments.Indexes.CreateOne(new CreateIndexModel<MediaAttachmentDocument>(
                Builders<MediaAttachmentDocument>.IndexKeys
                    .Ascending(m => m.UploadedByUserId)
                    .Ascending(m => m.FieldAssignment)));

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

        // One compiled review per field + period (month yyyyMM or year yyyy); Id is the upsert key.
        var weatherReviews = _context.GetCollection<FieldWeatherPeriodReviewDocument>("field_weather_period_reviews");
        weatherReviews.Indexes.CreateOne(new CreateIndexModel<FieldWeatherPeriodReviewDocument>(
            Builders<FieldWeatherPeriodReviewDocument>.IndexKeys
                .Ascending(r => r.FieldId)
                .Descending(r => r.OccurredAt)));
        weatherReviews.Indexes.CreateOne(new CreateIndexModel<FieldWeatherPeriodReviewDocument>(
            Builders<FieldWeatherPeriodReviewDocument>.IndexKeys
                .Ascending(r => r.FieldId)
                .Ascending(r => r.PeriodType)
                .Ascending(r => r.Year)
                .Ascending(r => r.Month),
            new CreateIndexOptions { Unique = true }));

        var weatherExtremes = _context.GetCollection<FieldWeatherExtremeEventDocument>("field_weather_extreme_events");
        weatherExtremes.Indexes.CreateOne(new CreateIndexModel<FieldWeatherExtremeEventDocument>(
            Builders<FieldWeatherExtremeEventDocument>.IndexKeys
                .Ascending(e => e.FieldId)
                .Descending(e => e.OccurredAt)));
        weatherExtremes.Indexes.CreateOne(new CreateIndexModel<FieldWeatherExtremeEventDocument>(
            Builders<FieldWeatherExtremeEventDocument>.IndexKeys.Ascending(e => e.DedupKey),
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

        EnsureFieldWorkIndexes();
    }

    private void EnsureFieldWorkIndexes()
    {
        var templates = _context.GetCollection<FieldWorkTaskTemplateDocument>("field_work_templates");
        templates.Indexes.CreateOne(new CreateIndexModel<FieldWorkTaskTemplateDocument>(
            Builders<FieldWorkTaskTemplateDocument>.IndexKeys.Ascending(t => t.Code),
            new CreateIndexOptions { Unique = true }));

        var versions = _context.GetCollection<FieldWorkTaskTemplateVersionDocument>("field_work_template_versions");
        versions.Indexes.CreateOne(new CreateIndexModel<FieldWorkTaskTemplateVersionDocument>(
            Builders<FieldWorkTaskTemplateVersionDocument>.IndexKeys
                .Ascending(v => v.TemplateCode)
                .Ascending(v => v.Version),
            new CreateIndexOptions { Unique = true }));

        var proposals = _context.GetCollection<TaskProposalDocument>("task_proposals");
        proposals.Indexes.CreateOne(new CreateIndexModel<TaskProposalDocument>(
            Builders<TaskProposalDocument>.IndexKeys
                .Ascending(p => p.FieldId)
                .Ascending(p => p.ResultYear)
                .Ascending(p => p.Status)));
            // Unique among open proposals only. Sparse + openDedupKey avoids $in
            // partial filters, which this MongoDB server rejects.
            proposals.Indexes.CreateOne(new CreateIndexModel<TaskProposalDocument>(
                Builders<TaskProposalDocument>.IndexKeys.Ascending(p => p.OpenDedupKey),
                new CreateIndexOptions
                {
                    Unique = true,
                    Sparse = true,
                    Name = "dedupKey_open_unique"
                }));
        proposals.Indexes.CreateOne(new CreateIndexModel<TaskProposalDocument>(
            Builders<TaskProposalDocument>.IndexKeys
                .Ascending(p => p.FieldId)
                .Ascending(p => p.TemplateCode)
                .Ascending(p => p.ResultYear)));

        var fieldTasks = _context.GetCollection<FieldTaskDocument>("field_tasks");
        fieldTasks.Indexes.CreateOne(new CreateIndexModel<FieldTaskDocument>(
            Builders<FieldTaskDocument>.IndexKeys
                .Ascending(t => t.FieldId)
                .Ascending(t => t.ResultYear)
                .Ascending(t => t.Status)));
        fieldTasks.Indexes.CreateOne(new CreateIndexModel<FieldTaskDocument>(
            Builders<FieldTaskDocument>.IndexKeys
                .Ascending(t => t.AssignedUserId)
                .Ascending(t => t.Status)));
        // Partial (not sparse): multiple missing/null proposalId values must be allowed;
        // uniqueness only applies when proposalId is a real string. Drop legacy sparse unique if present.
        try { fieldTasks.Indexes.DropOne("proposalId_1"); }
        catch (MongoCommandException) { /* index may not exist */ }
        fieldTasks.Indexes.CreateOne(new CreateIndexModel<FieldTaskDocument>(
            Builders<FieldTaskDocument>.IndexKeys.Ascending(t => t.ProposalId),
            new CreateIndexOptions<FieldTaskDocument>
            {
                Unique = true,
                Name = "proposalId_1",
                PartialFilterExpression = Builders<FieldTaskDocument>.Filter.Type(t => t.ProposalId, BsonType.String)
            }));
        fieldTasks.Indexes.CreateOne(new CreateIndexModel<FieldTaskDocument>(
            Builders<FieldTaskDocument>.IndexKeys.Ascending(t => t.RelatedHarvestId),
            new CreateIndexOptions { Sparse = true }));

        var executions = _context.GetCollection<TaskExecutionDocument>("task_executions");
        executions.Indexes.CreateOne(new CreateIndexModel<TaskExecutionDocument>(
            Builders<TaskExecutionDocument>.IndexKeys.Ascending(e => e.TaskId)));
        executions.Indexes.CreateOne(new CreateIndexModel<TaskExecutionDocument>(
            Builders<TaskExecutionDocument>.IndexKeys
                .Ascending(e => e.FieldId)
                .Ascending(e => e.ResultYear)));

        var phenology = _context.GetCollection<FieldPhenologyObservationDocument>("field_phenology_observations");
        phenology.Indexes.CreateOne(new CreateIndexModel<FieldPhenologyObservationDocument>(
            Builders<FieldPhenologyObservationDocument>.IndexKeys
                .Ascending(o => o.FieldId)
                .Descending(o => o.ObservedOn)));

        var profiles = _context.GetCollection<FieldWorkProfileDocument>("field_work_profiles");
        profiles.Indexes.CreateOne(new CreateIndexModel<FieldWorkProfileDocument>(
            Builders<FieldWorkProfileDocument>.IndexKeys.Ascending(p => p.FieldId),
            new CreateIndexOptions { Unique = true, Name = "fieldId_unique" }));
        profiles.Indexes.CreateOne(new CreateIndexModel<FieldWorkProfileDocument>(
            Builders<FieldWorkProfileDocument>.IndexKeys
                .Ascending(p => p.Status)
                .Ascending(p => p.FieldId)));

        var harvests = _context.GetCollection<HarvestRecordDocument>("harvest_records");
        harvests.Indexes.CreateOne(new CreateIndexModel<HarvestRecordDocument>(
            Builders<HarvestRecordDocument>.IndexKeys
                .Ascending(h => h.FieldId)
                .Ascending(h => h.ResultYear)));

        var oilLots = _context.GetCollection<OilLotDocument>("oil_lots");
        oilLots.Indexes.CreateOne(new CreateIndexModel<OilLotDocument>(
            Builders<OilLotDocument>.IndexKeys
                .Ascending(l => l.OwnerUserId)
                .Ascending(l => l.BatchId),
            new CreateIndexOptions { Unique = true, Name = "ix_oil_lots_owner_batch" }));
        oilLots.Indexes.CreateOne(new CreateIndexModel<OilLotDocument>(
            Builders<OilLotDocument>.IndexKeys
                .Ascending(l => l.OwnerUserId)
                .Ascending(l => l.ResultYear)
                .Ascending(l => l.PressedOn),
            new CreateIndexOptions { Name = "ix_oil_lots_owner_year_pressed" }));

        var oilCommitments = _context.GetCollection<OilCommitmentDocument>("oil_commitments");
        oilCommitments.Indexes.CreateOne(new CreateIndexModel<OilCommitmentDocument>(
            Builders<OilCommitmentDocument>.IndexKeys
                .Ascending(c => c.OwnerUserId)
                .Descending(c => c.CreatedAt),
            new CreateIndexOptions { Name = "ix_oil_commitments_owner_created" }));

        var stockMovements = _context.GetCollection<StockMovementDocument>("stock_movements");
        stockMovements.Indexes.CreateOne(new CreateIndexModel<StockMovementDocument>(
            Builders<StockMovementDocument>.IndexKeys
                .Ascending(m => m.OwnerUserId)
                .Descending(m => m.OccurredOn),
            new CreateIndexOptions { Name = "ix_stock_movements_owner_occurred" }));

        var feedback = _context.GetCollection<UserFeedbackDocument>("user_feedback");
        feedback.Indexes.CreateOne(new CreateIndexModel<UserFeedbackDocument>(
            Builders<UserFeedbackDocument>.IndexKeys
                .Ascending(f => f.UserId)
                .Descending(f => f.CreatedAt),
            new CreateIndexOptions { Name = "ix_user_feedback_userId_createdAt" }));
        feedback.Indexes.CreateOne(new CreateIndexModel<UserFeedbackDocument>(
            Builders<UserFeedbackDocument>.IndexKeys
                .Ascending(f => f.SeenAt)
                .Descending(f => f.CreatedAt),
            new CreateIndexOptions { Name = "ix_user_feedback_seenAt_createdAt" }));

        var campaigns = _context.GetCollection<InAppCampaignDocument>("in_app_campaigns");
        campaigns.Indexes.CreateOne(new CreateIndexModel<InAppCampaignDocument>(
            Builders<InAppCampaignDocument>.IndexKeys
                .Ascending(c => c.Status)
                .Ascending(c => c.StartsAt)
                .Ascending(c => c.EndsAt),
            new CreateIndexOptions { Name = "ix_in_app_campaigns_status_window" }));

        var engagements = _context.GetCollection<CampaignEngagementDocument>("campaign_engagements");
        engagements.Indexes.CreateOne(new CreateIndexModel<CampaignEngagementDocument>(
            Builders<CampaignEngagementDocument>.IndexKeys
                .Ascending(e => e.UserId)
                .Ascending(e => e.CampaignId),
            new CreateIndexOptions { Unique = true, Name = "ix_campaign_engagements_user_campaign" }));
        engagements.Indexes.CreateOne(new CreateIndexModel<CampaignEngagementDocument>(
            Builders<CampaignEngagementDocument>.IndexKeys.Ascending(e => e.CampaignId),
            new CreateIndexOptions { Name = "ix_campaign_engagements_campaign" }));

        var answers = _context.GetCollection<CampaignAnswerDocument>("campaign_answers");
        answers.Indexes.CreateOne(new CreateIndexModel<CampaignAnswerDocument>(
            Builders<CampaignAnswerDocument>.IndexKeys
                .Ascending(a => a.UserId)
                .Ascending(a => a.CampaignId)
                .Ascending(a => a.QuestionId),
            new CreateIndexOptions { Unique = true, Name = "ix_campaign_answers_user_campaign_question" }));
        answers.Indexes.CreateOne(new CreateIndexModel<CampaignAnswerDocument>(
            Builders<CampaignAnswerDocument>.IndexKeys
                .Ascending(a => a.CampaignId)
                .Descending(a => a.CreatedAt),
            new CreateIndexOptions { Name = "ix_campaign_answers_campaign_createdAt" }));
    }
}
