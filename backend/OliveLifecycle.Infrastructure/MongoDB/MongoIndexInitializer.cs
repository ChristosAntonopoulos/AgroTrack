using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;

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

            _logger.LogInformation("MongoDB indexes ensured.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "MongoDB index creation encountered an issue (indexes may already exist).");
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
