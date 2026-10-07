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

        // Review users are upserted every start so store-review logins stay valid.
        await SeedReviewUsersAsync(cancellationToken);
        await RemoveRetiredDemoUsersAsync(cancellationToken);

        var farmPresent = await DemoFieldsPresentAsync(cancellationToken);
        if (farmPresent && !reseedFarm)
        {
            _logger.LogInformation(
                "Review farm already present ({Upper}, {Lower}) — skipping wipe/reseed. Set DemoAccounts:ReseedFarmData=true to rebuild.",
                DemoFarmDataSeeder.FieldName,
                DemoFarmDataSeeder.FieldNameLower);
            return;
        }

        if (reseedFarm)
        {
            // Explicit rebuild: drop every collection, then seed fresh.
            await WipeDatabaseAsync(cancellationToken);
            await SeedReviewUsersAsync(cancellationToken);
            await FieldWorkCatalogueSeeder.SeedAsync(_context, _logger, cancellationToken);
            await ServiceCategorySeeder.SeedAsync(_context, _logger, cancellationToken);
        }

        await DemoFarmDataSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);
        await SimpleFarmerStorySeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);
        await OwnerPartnerDemoSeeder.SeedAsync(_context, _configuration, _logger, cancellationToken);

        _logger.LogInformation(
            "Review farm seeded: {Upper} + {Lower} with admin ({Admin}) + collaborator ({Partner}).",
            DemoFarmDataSeeder.FieldName,
            DemoFarmDataSeeder.FieldNameLower,
            DemoFarmDataSeeder.OwnerEmail,
            DemoFarmDataSeeder.PartnerEmail);
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

    /// <summary>
    /// App Store / Play review accounts. Credentials go in store review notes — not on the login UI.
    /// Admin = grove owner (FieldOwner). Collaborator = partner with work seat on both ελαιώνες.
    /// </summary>
    private static readonly (string Id, string Email, string Password, string Role, string FirstName, string LastName) ReviewAdmin =
        (DemoFarmDataSeeder.OwnerId, DemoFarmDataSeeder.OwnerEmail, DemoFarmDataSeeder.OwnerPassword, Roles.FieldOwner, "Γιώργος", "Παπαδάκης");

    private static readonly (string Id, string Email, string Password, string Role, string FirstName, string LastName) ReviewCollaborator =
        (DemoFarmDataSeeder.ProducerId, DemoFarmDataSeeder.PartnerEmail, DemoFarmDataSeeder.PartnerPassword, Roles.Producer, "Κώστας", "Μανούσακης");

    private static readonly string[] RetiredDemoEmails =
    [
        "owner@olivefarm.com",
        "producer1@olivefarm.com",
        "family@olivefarm.com",
        "admin@olivefarm.com",
    ];

    private static readonly string[] RetiredDemoUserIds =
    [
        "675555555555555555555503",
        "675555555555555555555599",
    ];

    private async Task SeedReviewUsersAsync(CancellationToken cancellationToken)
    {
        if (!string.Equals(_configuration["DemoAccounts:Seed"], "true", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var collection = _context.GetCollection<UserDocument>("users");
        var now = DateTime.UtcNow;

        await UpsertReviewUserAsync(collection, ReviewAdmin, now, cancellationToken);
        await UpsertReviewUserAsync(collection, ReviewCollaborator, now, cancellationToken);
    }

    private async Task RemoveRetiredDemoUsersAsync(CancellationToken cancellationToken)
    {
        if (!string.Equals(_configuration["DemoAccounts:Seed"], "true", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var collection = _context.GetCollection<UserDocument>("users");
        var emailFilters = RetiredDemoEmails.Select(email =>
            Builders<UserDocument>.Filter.Regex(
                u => u.Email,
                new BsonRegularExpression($"^{Regex.Escape(email)}$", "i")));
        var filter = Builders<UserDocument>.Filter.Or(
            Builders<UserDocument>.Filter.Or(emailFilters),
            Builders<UserDocument>.Filter.In(u => u.Id, RetiredDemoUserIds));

        var result = await collection.DeleteManyAsync(filter, cancellationToken);
        if (result.DeletedCount > 0)
        {
            _logger.LogInformation("Removed {Count} retired demo user(s).", result.DeletedCount);
        }
    }

    private async Task UpsertReviewUserAsync(
        IMongoCollection<UserDocument> collection,
        (string Id, string Email, string Password, string Role, string FirstName, string LastName) review,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(review.Password);
        var existing = await FindReviewUserAsync(collection, review, cancellationToken);

        if (existing == null)
        {
            try
            {
                await collection.InsertOneAsync(
                    NewReviewUser(review, passwordHash, now),
                    cancellationToken: cancellationToken);

                _logger.LogInformation("Seeded review account {Email} ({Role}).", review.Email, review.Role);
            }
            catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
            {
                _logger.LogWarning(
                    "Review user {Email} insert conflict on id {Id}; syncing existing document.",
                    review.Email,
                    review.Id);
                await SyncReviewUserAsync(collection, review, passwordHash, now, review.Id, cancellationToken);
            }

            return;
        }

        await SyncReviewUserAsync(collection, review, passwordHash, now, existing.Id, cancellationToken);
    }

    private static UserDocument NewReviewUser(
        (string Id, string Email, string Password, string Role, string FirstName, string LastName) review,
        string passwordHash,
        DateTime now) =>
        new()
        {
            Id = review.Id,
            Email = review.Email,
            PasswordHash = passwordHash,
            Role = review.Role,
            FirstName = review.FirstName,
            LastName = review.LastName,
            Preferences = new UserExperiencePreferencesDocument
            {
                ExperienceMode = "full",
                ExperienceModeChosen = true,
            },
            CreatedAt = now,
            UpdatedAt = now,
        };

    private static async Task<UserDocument?> FindReviewUserAsync(
        IMongoCollection<UserDocument> collection,
        (string Id, string Email, string Password, string Role, string FirstName, string LastName) review,
        CancellationToken cancellationToken)
    {
        var emailFilter = Builders<UserDocument>.Filter.Regex(
            u => u.Email,
            new BsonRegularExpression($"^{Regex.Escape(review.Email)}$", "i"));
        var idFilter = Builders<UserDocument>.Filter.Eq(u => u.Id, review.Id);

        return await collection
            .Find(Builders<UserDocument>.Filter.Or(emailFilter, idFilter))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task SyncReviewUserAsync(
        IMongoCollection<UserDocument> collection,
        (string Id, string Email, string Password, string Role, string FirstName, string LastName) review,
        string passwordHash,
        DateTime now,
        string documentId,
        CancellationToken cancellationToken)
    {
        var update = Builders<UserDocument>.Update
            .Set(u => u.Email, review.Email)
            .Set(u => u.PasswordHash, passwordHash)
            .Set(u => u.Role, review.Role)
            .Set(u => u.FirstName, review.FirstName)
            .Set(u => u.LastName, review.LastName)
            .Set(u => u.Preferences.ExperienceMode, "full")
            .Set(u => u.Preferences.ExperienceModeChosen, true)
            .Set(u => u.UpdatedAt, now);

        await collection.UpdateOneAsync(
            u => u.Id == documentId,
            update,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Synced review account {Email} ({Role}).", review.Email, review.Role);
    }
}
