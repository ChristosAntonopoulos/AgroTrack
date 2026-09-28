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
        var reseedFarm = string.Equals(
            _configuration["DemoAccounts:ReseedFarmData"],
            "true",
            StringComparison.OrdinalIgnoreCase);

        // Catalogues are always idempotent (upsert by code/slug).
        await FieldWorkCatalogueSeeder.SeedAsync(_context, _logger, cancellationToken);
        await ServiceCategorySeeder.SeedAsync(_context, _logger, cancellationToken);

        if (!seedDemo)
        {
            return;
        }

        // Users are upserted every start so logins stay valid.
        await SeedOwnerAndAdminAsync(cancellationToken);
        await SeedPartnerAndFamilyAsync(cancellationToken);

        var farmPresent = await DemoFieldsPresentAsync(cancellationToken);
        if (farmPresent && !reseedFarm)
        {
            _logger.LogInformation(
                "Demo farm already present ({Upper}, {Lower}) — skipping wipe/reseed. Set DemoAccounts:ReseedFarmData=true to rebuild.",
                DemoFarmDataSeeder.FieldName,
                DemoFarmDataSeeder.FieldNameLower);
            return;
        }

        if (reseedFarm)
        {
            // Explicit rebuild: drop every collection, then seed fresh.
            await WipeDatabaseAsync(cancellationToken);
            await SeedOwnerAndAdminAsync(cancellationToken);
            await SeedPartnerAndFamilyAsync(cancellationToken);
            await FieldWorkCatalogueSeeder.SeedAsync(_context, _logger, cancellationToken);
            await ServiceCategorySeeder.SeedAsync(_context, _logger, cancellationToken);
        }

        await DemoFarmDataSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);
        await SimpleFarmerStorySeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);
        await OwnerPartnerDemoSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);
        await FamilyDemoSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);

        _logger.LogInformation(
            "Simple farmer demo seeded: {Upper} + {Lower} with owner + συνεργάτης + family.",
            DemoFarmDataSeeder.FieldName,
            DemoFarmDataSeeder.FieldNameLower);
    }

    private async Task<bool> DemoFieldsPresentAsync(CancellationToken cancellationToken)
    {
        var fields = _context.GetCollection<FieldDocument>("fields");
        foreach (var id in DemoFarmDataSeeder.FieldIds)
        {
            var exists = await fields.Find(f => f.Id == id).AnyAsync(cancellationToken);
            if (!exists) return false;
        }

        return true;
    }

    private async Task WipeDatabaseAsync(CancellationToken cancellationToken)
    {
        var databaseName = _context.Database.DatabaseNamespace.DatabaseName;
        var names = await _context.Database.ListCollectionNamesAsync(cancellationToken: cancellationToken);
        var dropped = 0;
        await names.ForEachAsync(
            async name =>
            {
                await _context.Database.DropCollectionAsync(name, cancellationToken);
                dropped++;
            },
            cancellationToken);

        _logger.LogInformation(
            "Phase 0: wiped database {Database} — dropped {Count} collections (clean slate).",
            databaseName,
            dropped);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static readonly (string Id, string Email, string Password, string Role, string FirstName, string LastName) OwnerUser =
        ("675555555555555555555501", "owner@olivefarm.com", "password123", Roles.FieldOwner, "Γιώργος", "Παπαδάκης");

    private static readonly (string Id, string Email, string Password, string Role, string FirstName, string LastName) PartnerUser =
        ("675555555555555555555502", "producer1@olivefarm.com", "password123", Roles.Producer, "Κώστας", "Μανούσακης");

    private static readonly (string Id, string Email, string Password, string Role, string FirstName, string LastName) FamilyUser =
        ("675555555555555555555503", "family@olivefarm.com", "password123", Roles.FieldOwner, "Ελένη", "Παπαδάκη");

    /// <summary>
    /// Private operator. Not shown on the demo login picker — type the email and password on the normal form.
    /// </summary>
    private static readonly (string Id, string Email, string Password, string Role, string FirstName, string LastName) HiddenOperator =
        ("675555555555555555555599", "admin@olivefarm.com", "admin123", Roles.Administrator, "Olea", "Admin");

    private async Task SeedOwnerAndAdminAsync(CancellationToken cancellationToken)
    {
        if (!string.Equals(_configuration["DemoAccounts:Seed"], "true", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var collection = _context.GetCollection<UserDocument>("users");
        var now = DateTime.UtcNow;

        await UpsertDemoUserAsync(collection, OwnerUser, now, operatorAccount: false, cancellationToken);
        await UpsertDemoUserAsync(collection, HiddenOperator, now, operatorAccount: true, cancellationToken);
    }

    private async Task SeedPartnerAndFamilyAsync(CancellationToken cancellationToken)
    {
        if (!string.Equals(_configuration["DemoAccounts:Seed"], "true", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var collection = _context.GetCollection<UserDocument>("users");
        var now = DateTime.UtcNow;

        await UpsertDemoUserAsync(collection, PartnerUser, now, operatorAccount: false, cancellationToken);
        await UpsertDemoUserAsync(collection, FamilyUser, now, operatorAccount: false, cancellationToken);
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
}
