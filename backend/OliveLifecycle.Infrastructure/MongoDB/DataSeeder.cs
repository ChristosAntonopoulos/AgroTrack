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
        await FieldWorkCatalogueSeeder.SeedAsync(_context, _logger, cancellationToken);
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
