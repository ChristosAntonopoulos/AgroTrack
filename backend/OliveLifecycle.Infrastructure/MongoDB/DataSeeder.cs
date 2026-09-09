using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.MongoDB;

public class DataSeeder : IHostedService
{
    private readonly MongoDbContext _context;
    private readonly ILogger<DataSeeder> _logger;
    private readonly IConfiguration _configuration;

    public DataSeeder(MongoDbContext context, ILogger<DataSeeder> logger, IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await SeedDemoUsersAsync(cancellationToken);
        await SeedTaskTemplatesAsync(cancellationToken);
        await EnsureHarvestPhaseTemplatesAsync(cancellationToken);
        await SeedMinistryNotificationsAsync(cancellationToken);
        await ServiceCategorySeeder.SeedAsync(_context, _logger, cancellationToken);
        await DemoFarmDataSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);
        await ChronologioDemoSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);
        await PartnerDemoSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static readonly (string Id, string Email, string Password, string Role, string FirstName, string LastName)[] DemoUsers =
    [
        ("675555555555555555555501", "owner@olivefarm.com", "password123", Roles.FieldOwner, "Giorgos", "Papadakis"),
        ("675555555555555555555502", "producer1@olivefarm.com", "password123", Roles.Producer, "Kostas", "Manousakis"),
    ];

    private async Task SeedDemoUsersAsync(CancellationToken cancellationToken)
    {
        if (!string.Equals(_configuration["DemoAccounts:Seed"], "true", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var collection = _context.GetCollection<UserDocument>("users");
        var now = DateTime.UtcNow;

        foreach (var demo in DemoUsers)
        {
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(demo.Password);
            var existing = await FindDemoUserAsync(collection, demo, cancellationToken);

            if (existing == null)
            {
                try
                {
                    await collection.InsertOneAsync(
                        new UserDocument
                        {
                            Id = demo.Id,
                            Email = demo.Email,
                            PasswordHash = passwordHash,
                            Role = demo.Role,
                            FirstName = demo.FirstName,
                            LastName = demo.LastName,
                            CreatedAt = now,
                            UpdatedAt = now,
                        },
                        cancellationToken: cancellationToken);

                    _logger.LogInformation("Seeded demo account {Email} ({Role}).", demo.Email, demo.Role);
                }
                catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
                {
                    // Document exists by _id but email lookup missed it (e.g. email changed) — sync in place.
                    _logger.LogWarning(
                        "Demo user {Email} insert conflict on id {Id}; syncing existing document.",
                        demo.Email,
                        demo.Id);
                    await SyncDemoUserAsync(collection, demo, passwordHash, now, demo.Id, cancellationToken);
                }

                continue;
            }

            await SyncDemoUserAsync(collection, demo, passwordHash, now, existing.Id, cancellationToken);
        }
    }

    private static async Task<UserDocument?> FindDemoUserAsync(
        IMongoCollection<UserDocument> collection,
        (string Id, string Email, string Password, string Role, string FirstName, string LastName) demo,
        CancellationToken cancellationToken)
    {
        var emailFilter = Builders<UserDocument>.Filter.Regex(
            u => u.Email,
            new BsonRegularExpression($"^{Regex.Escape(demo.Email)}$", "i"));
        var idFilter = Builders<UserDocument>.Filter.Eq(u => u.Id, demo.Id);

        return await collection
            .Find(Builders<UserDocument>.Filter.Or(emailFilter, idFilter))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task SyncDemoUserAsync(
        IMongoCollection<UserDocument> collection,
        (string Id, string Email, string Password, string Role, string FirstName, string LastName) demo,
        string passwordHash,
        DateTime now,
        string documentId,
        CancellationToken cancellationToken)
    {
        await collection.UpdateOneAsync(
            u => u.Id == documentId,
            Builders<UserDocument>.Update
                .Set(u => u.Email, demo.Email)
                .Set(u => u.PasswordHash, passwordHash)
                .Set(u => u.Role, demo.Role)
                .Set(u => u.FirstName, demo.FirstName)
                .Set(u => u.LastName, demo.LastName)
                .Set(u => u.UpdatedAt, now),
            cancellationToken: cancellationToken);

        _logger.LogInformation("Synced demo account {Email} ({Role}).", demo.Email, demo.Role);
    }

    private async Task SeedTaskTemplatesAsync(CancellationToken cancellationToken)
    {
        var collection = _context.GetCollection<TaskTemplateDocument>("task_templates");
        var count = await collection.CountDocumentsAsync(FilterDefinition<TaskTemplateDocument>.Empty, cancellationToken: cancellationToken);
        if (count > 0)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var templates = new[]
        {
            new TaskTemplateDocument { Type = "general_field_inspection", Title = "General field inspection", Description = "Inspect tree health, weeds, irrigation, pests.", LifecycleYear = "low", CreatedAt = now, UpdatedAt = now },
            new TaskTemplateDocument { Type = "soil_analysis", Title = "Soil analysis", Description = "Collect soil samples for lab analysis.", LifecycleYear = "low", CreatedAt = now, UpdatedAt = now },
            new TaskTemplateDocument { Type = "pruning", Title = "Pruning", Description = "Seasonal pruning of olive trees.", LifecycleYear = "low", CreatedAt = now, UpdatedAt = now },
            new TaskTemplateDocument { Type = "irrigation_check", Title = "Irrigation system check", Description = "Verify emitters, pressure, and scheduling.", LifecycleYear = "high", CreatedAt = now, UpdatedAt = now },
            new TaskTemplateDocument { Type = "harvest", Title = "Harvest", Description = "Harvest olives and record yields.", LifecycleYear = "high", CreatedAt = now, UpdatedAt = now },
        };

        await collection.InsertManyAsync(templates, cancellationToken: cancellationToken);
        _logger.LogInformation("Seeded {Count} task templates.", templates.Length);
    }

    private async Task EnsureHarvestPhaseTemplatesAsync(CancellationToken cancellationToken)
    {
        var collection = _context.GetCollection<TaskTemplateDocument>("task_templates");
        var now = DateTime.UtcNow;
        var harvestTemplates = new[]
        {
            new TaskTemplateDocument
            {
                Type = "harvest_ready_nets",
                Title = "Ready nets and crates",
                Description = "Lay out nets, crates, and rakes so picking can start without delay.",
                LifecycleYear = "high",
                HarvestPhase = "prepare",
                CreatedAt = now,
                UpdatedAt = now
            },
            new TaskTemplateDocument
            {
                Type = "harvest_book_mill",
                Title = "Book the mill",
                Description = "Call the mill and confirm a delivery slot before picking starts.",
                LifecycleYear = "high",
                HarvestPhase = "prepare",
                CreatedAt = now,
                UpdatedAt = now
            },
            new TaskTemplateDocument
            {
                Type = "harvest_call_crew",
                Title = "Call the crew",
                Description = "Confirm who is coming to pick and when they arrive.",
                LifecycleYear = "high",
                HarvestPhase = "prepare",
                CreatedAt = now,
                UpdatedAt = now
            },
            new TaskTemplateDocument
            {
                Type = "harvest_check_access",
                Title = "Check access and weather",
                Description = "Walk the entrance, roads, and forecast before crews arrive.",
                LifecycleYear = "high",
                HarvestPhase = "prepare",
                CreatedAt = now,
                UpdatedAt = now
            },
            new TaskTemplateDocument
            {
                Type = "harvest_daily_kilos",
                Title = "Write today's kilos",
                Description = "Record which grove you picked and how many kilos today.",
                LifecycleYear = "high",
                HarvestPhase = "daily",
                CreatedAt = now,
                UpdatedAt = now
            },
            new TaskTemplateDocument
            {
                Type = "harvest",
                Title = "Write today's kilos",
                Description = "Harvest olives and write today's kilos.",
                LifecycleYear = "high",
                HarvestPhase = "daily",
                CreatedAt = now,
                UpdatedAt = now
            },
            new TaskTemplateDocument
            {
                Type = "harvest_mill_delivery",
                Title = "Take olives to the mill",
                Description = "Deliver fruit, write oil kilos if you have them, and note mill cost.",
                LifecycleYear = "high",
                HarvestPhase = "final",
                CreatedAt = now,
                UpdatedAt = now
            },
            new TaskTemplateDocument
            {
                Type = "harvest_close_season",
                Title = "Close this harvest",
                Description = "Mark harvest done for the year and write the sale if money came in.",
                LifecycleYear = "high",
                HarvestPhase = "final",
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        var added = 0;
        var stamped = 0;
        foreach (var template in harvestTemplates)
        {
            var existing = await collection.Find(t => t.Type == template.Type).FirstOrDefaultAsync(cancellationToken);
            if (existing == null)
            {
                await collection.InsertOneAsync(template, cancellationToken: cancellationToken);
                added++;
                continue;
            }

            if (string.IsNullOrWhiteSpace(existing.HarvestPhase))
            {
                existing.HarvestPhase = template.HarvestPhase;
                existing.UpdatedAt = now;
                await collection.ReplaceOneAsync(t => t.Id == existing.Id, existing, cancellationToken: cancellationToken);
                stamped++;
            }
        }

        var legacy = await collection.Find(t =>
                (t.HarvestPhase == null || t.HarvestPhase == "") &&
                (t.Type == "harvest_planning"
                 || t.Type == "harvest_equipment_preparation"
                 || t.Type == "pre_harvest_field_access_cleanup"
                 || t.Type == "olive_harvest"
                 || t.Type == "post_harvest_field_inspection"
                 || t.Type == "annual_field_report"))
            .ToListAsync(cancellationToken);

        foreach (var document in legacy)
        {
            document.HarvestPhase = document.Type switch
            {
                "olive_harvest" => "daily",
                "post_harvest_field_inspection" or "annual_field_report" => "final",
                _ => "prepare"
            };
            document.UpdatedAt = now;
            await collection.ReplaceOneAsync(t => t.Id == document.Id, document, cancellationToken: cancellationToken);
            stamped++;
        }

        _logger.LogInformation("Harvest phase templates: added {Added}, stamped {Stamped}.", added, stamped);
    }

    private async Task SeedMinistryNotificationsAsync(CancellationToken cancellationToken)
    {
        var collection = _context.GetCollection<MinistryNotificationDocument>("ministry_notifications");
        var count = await collection.CountDocumentsAsync(FilterDefinition<MinistryNotificationDocument>.Empty, cancellationToken: cancellationToken);
        if (count > 0)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var notifications = new[]
        {
            new MinistryNotificationDocument
            {
                Title = "New Pesticide Regulations",
                Message = "Updated regulations regarding pesticide usage. Complete certification by end of month.",
                Type = "regulation",
                Priority = "high",
                PublishedAt = now.AddDays(-2),
                ExpirationDate = now.AddDays(28),
                Category = "Compliance",
                TargetRoles = ["Producer", "ServiceProvider", "Agronomist"],
                CreatedAt = now,
                UpdatedAt = now
            },
            new MinistryNotificationDocument
            {
                Title = "Olive Oil Subsidy Program",
                Message = "Applications for the olive oil production subsidy are now open.",
                Type = "subsidy",
                Priority = "high",
                PublishedAt = now.AddDays(-5),
                ExpirationDate = now.AddMonths(2),
                Category = "Financial",
                TargetRoles = ["FieldOwner"],
                CreatedAt = now,
                UpdatedAt = now
            },
            new MinistryNotificationDocument
            {
                Title = "Annual Field Registration Deadline",
                Message = "All field owners must complete annual registration.",
                Type = "deadline",
                Priority = "high",
                PublishedAt = now.AddDays(-1),
                ExpirationDate = now.AddMonths(1),
                Category = "Compliance",
                TargetRoles = ["FieldOwner"],
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        await collection.InsertManyAsync(notifications, cancellationToken: cancellationToken);
        _logger.LogInformation("Seeded {Count} ministry notifications.", notifications.Length);
    }
}
