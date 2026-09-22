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
        var seedDemo = string.Equals(
            _configuration["DemoAccounts:Seed"],
            "true",
            StringComparison.OrdinalIgnoreCase);

        await SeedDemoUsersAsync(cancellationToken);
        await FieldWorkCatalogueSeeder.SeedAsync(_context, _logger, cancellationToken);
        // Alpha grove demo: no English ministry spam and no δάκος campaign on first login.
        await ServiceCategorySeeder.SeedAsync(_context, _logger, cancellationToken);
        await DemoFarmDataSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);
        await FieldWorkDemoSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);
        await ChronologioDemoSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);
        // Marketplace four-user listings skipped for alpha (three household people only).
        await FamilyDemoSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);
        await OwnerPartnerDemoSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);

        if (seedDemo)
        {
            _logger.LogInformation(
                "Alpha demo seeded: owner + συνεργάτης + family on Filiatra grove (no marketplace providers).");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static readonly (string Id, string Email, string Password, string Role, string FirstName, string LastName)[] DemoUsers =
    [
        ("675555555555555555555501", "owner@olivefarm.com", "password123", Roles.FieldOwner, "Γιώργος", "Παπαδάκης"),
        ("675555555555555555555502", "producer1@olivefarm.com", "password123", Roles.Producer, "Κώστας", "Μανούσακης"),
        ("675555555555555555555503", "family@olivefarm.com", "password123", Roles.FieldOwner, "Ελένη", "Παπαδάκη"),
    ];

    /// <summary>
    /// Private operator. Not shown on the demo login picker — type the email and password on the normal form.
    /// </summary>
    private static readonly (string Id, string Email, string Password, string Role, string FirstName, string LastName) HiddenOperator =
        ("675555555555555555555599", "admin@olivefarm.com", "admin123", Roles.Administrator, "Olea", "Admin");

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
            await UpsertDemoUserAsync(collection, demo, now, operatorAccount: false, cancellationToken);
        }

        await UpsertDemoUserAsync(collection, HiddenOperator, now, operatorAccount: true, cancellationToken);
    }

    private async Task UpsertDemoUserAsync(
        IMongoCollection<UserDocument> collection,
        (string Id, string Email, string Password, string Role, string FirstName, string LastName) demo,
        DateTime now,
        bool operatorAccount,
        CancellationToken cancellationToken)
    {
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(demo.Password);
        var existing = await FindDemoUserAsync(collection, demo, cancellationToken);

        if (existing == null)
        {
            try
            {
                await collection.InsertOneAsync(
                    NewDemoUser(demo, passwordHash, now, operatorAccount),
                    cancellationToken: cancellationToken);

                _logger.LogInformation("Seeded demo account {Email} ({Role}).", demo.Email, demo.Role);
            }
            catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
            {
                _logger.LogWarning(
                    "Demo user {Email} insert conflict on id {Id}; syncing existing document.",
                    demo.Email,
                    demo.Id);
                await SyncDemoUserAsync(collection, demo, passwordHash, now, demo.Id, operatorAccount, cancellationToken);
            }

            return;
        }

        await SyncDemoUserAsync(collection, demo, passwordHash, now, existing.Id, operatorAccount, cancellationToken);
    }

    private static UserDocument NewDemoUser(
        (string Id, string Email, string Password, string Role, string FirstName, string LastName) demo,
        string passwordHash,
        DateTime now,
        bool operatorAccount) =>
        new()
        {
            Id = demo.Id,
            Email = demo.Email,
            PasswordHash = passwordHash,
            Role = demo.Role,
            FirstName = demo.FirstName,
            LastName = demo.LastName,
            Preferences = operatorAccount
                ? new UserExperiencePreferencesDocument
                {
                    ExperienceMode = "full",
                    ExperienceModeChosen = true,
                }
                : new UserExperiencePreferencesDocument(),
            CreatedAt = now,
            UpdatedAt = now,
        };

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
        bool operatorAccount,
        CancellationToken cancellationToken)
    {
        var update = Builders<UserDocument>.Update
            .Set(u => u.Email, demo.Email)
            .Set(u => u.PasswordHash, passwordHash)
            .Set(u => u.Role, demo.Role)
            .Set(u => u.FirstName, demo.FirstName)
            .Set(u => u.LastName, demo.LastName)
            .Set(u => u.UpdatedAt, now);

        if (operatorAccount)
        {
            update = update
                .Set(u => u.Preferences.ExperienceMode, "full")
                .Set(u => u.Preferences.ExperienceModeChosen, true);
        }

        await collection.UpdateOneAsync(
            u => u.Id == documentId,
            update,
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
