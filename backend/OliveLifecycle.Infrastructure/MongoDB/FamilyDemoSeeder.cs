using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Core;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Ensures Eleni has Family seats on Giorgos's Filiatra fields (field-centric model).
/// Legacy family_circles / family_members collections are no longer written.
/// </summary>
public static class FamilyDemoSeeder
{
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

        var fields = context.GetCollection<FieldDocument>("fields");
        var now = DateTime.UtcNow;
        var updated = 0;

        foreach (var fieldId in DemoFarmDataSeeder.FieldIds)
        {
            var field = await fields.Find(f => f.Id == fieldId).FirstOrDefaultAsync(cancellationToken);
            if (field == null)
            {
                continue;
            }

            field.Memberships ??= new List<FieldMembershipDocument>();
            var existing = field.Memberships.FirstOrDefault(m =>
                string.Equals(m.UserId, DemoFarmDataSeeder.FamilyUserId, StringComparison.Ordinal)
                || string.Equals(m.Role, "Family", StringComparison.OrdinalIgnoreCase)
                   && string.Equals(m.Email, "family@olivefarm.com", StringComparison.OrdinalIgnoreCase));

            if (existing == null)
            {
                field.Memberships.Add(new FieldMembershipDocument
                {
                    UserId = DemoFarmDataSeeder.FamilyUserId,
                    Role = "Family",
                    Modules =
                    [
                        FamilyModules.Fields,
                        FamilyModules.Money,
                        FamilyModules.Harvest,
                        FamilyModules.Documents,
                        FamilyModules.Chronologio,
                    ],
                    AccessLevel = FamilyAccessLevels.Help,
                    Status = FamilyMemberStatuses.Active,
                    InvitedBy = DemoFarmDataSeeder.OwnerId,
                    DisplayName = "Ελένη Παπαδοπούλου",
                    Email = "family@olivefarm.com",
                    CreatedAt = now.AddDays(-180),
                });
                updated++;
            }
            else
            {
                existing.Role = "Family";
                existing.UserId = DemoFarmDataSeeder.FamilyUserId;
                existing.Modules =
                [
                    FamilyModules.Fields,
                    FamilyModules.Money,
                    FamilyModules.Harvest,
                    FamilyModules.Documents,
                    FamilyModules.Chronologio,
                ];
                existing.AccessLevel = FamilyAccessLevels.Help;
                existing.Status = FamilyMemberStatuses.Active;
            }

            await fields.ReplaceOneAsync(f => f.Id == fieldId, field, cancellationToken: cancellationToken);
        }

        logger.LogInformation(
            "Seeded family seats: family@olivefarm.com Family on {Count} Filiatra fields (modules money+harvest+documents+calendar+fields, help).",
            DemoFarmDataSeeder.FieldIds.Length);
    }
}
