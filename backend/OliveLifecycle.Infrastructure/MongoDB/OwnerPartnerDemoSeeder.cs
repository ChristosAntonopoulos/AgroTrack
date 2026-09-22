using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Core;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Ensures Kostas is Partner on Giorgos's three Filiatra fields.
/// He works the trees and does not keep the money or harvest books.
/// </summary>
public static class OwnerPartnerDemoSeeder
{
    public const string PartnerOwnedFieldId = DemoFarmDataSeeder.PartnerOwnedFieldId;

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

        foreach (var fieldId in DemoFarmDataSeeder.FieldIds)
        {
            var field = await fields.Find(f => f.Id == fieldId).FirstOrDefaultAsync(cancellationToken);
            if (field == null)
            {
                continue;
            }

            field.Memberships ??= new List<FieldMembershipDocument>();
            var legacyWork = field.Memberships
                .Where(m => string.Equals(m.UserId, DemoFarmDataSeeder.ProducerId, StringComparison.Ordinal))
                .ToList();
            foreach (var dup in legacyWork.Skip(1).ToList())
            {
                field.Memberships.Remove(dup);
            }

            var seat = legacyWork.FirstOrDefault();
            if (seat == null)
            {
                field.Memberships.Add(new FieldMembershipDocument
                {
                    UserId = DemoFarmDataSeeder.ProducerId,
                    Role = "Partner",
                    Modules = DemoFarmDataSeeder.PartnerSeatModules.ToList(),
                    AccessLevel = FamilyAccessLevels.Work,
                    Status = FamilyMemberStatuses.Active,
                    InvitedBy = DemoFarmDataSeeder.OwnerId,
                    DisplayName = DemoFarmDataSeeder.PartnerDisplayName,
                    Email = "producer1@olivefarm.com",
                    CreatedAt = now.AddDays(-200),
                });
            }
            else
            {
                seat.Role = "Partner";
                seat.Modules = DemoFarmDataSeeder.PartnerSeatModules.ToList();
                seat.AccessLevel = FamilyAccessLevels.Work;
                seat.Status = FamilyMemberStatuses.Active;
                seat.DisplayName = DemoFarmDataSeeder.PartnerDisplayName;
                seat.Email = "producer1@olivefarm.com";
            }

            await fields.ReplaceOneAsync(f => f.Id == fieldId, field, cancellationToken: cancellationToken);
        }

        logger.LogInformation(
            "Seeded partner seats: producer1 works the three Filiatra fields and does not see money or harvest books.");
    }
}
