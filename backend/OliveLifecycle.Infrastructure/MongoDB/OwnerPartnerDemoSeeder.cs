using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Ensures Kostas is Partner on Giorgos's Filiatra fields, and optionally admins his own demo field.
/// Legacy owner_partner_links are no longer written.
/// </summary>
public static class OwnerPartnerDemoSeeder
{
    public const string PartnerOwnedFieldId = "675555555555555555555201";

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
                    Modules =
                    [
                        FamilyModules.Fields,
                        FamilyModules.Tasks,
                        FamilyModules.Calendar,
                    ],
                    AccessLevel = FamilyAccessLevels.Work,
                    Status = FamilyMemberStatuses.Active,
                    InvitedBy = DemoFarmDataSeeder.OwnerId,
                    DisplayName = "Κώστας Μανούσακης",
                    Email = "producer1@olivefarm.com",
                    CreatedAt = now.AddDays(-200),
                });
            }
            else
            {
                seat.Role = "Partner";
                seat.Modules =
                [
                    FamilyModules.Fields,
                    FamilyModules.Tasks,
                    FamilyModules.Calendar,
                ];
                seat.AccessLevel = FamilyAccessLevels.Work;
                seat.Status = FamilyMemberStatuses.Active;
                seat.DisplayName = "Κώστας Μανούσακης";
                seat.Email = "producer1@olivefarm.com";
            }

            await fields.ReplaceOneAsync(f => f.Id == fieldId, field, cancellationToken: cancellationToken);
        }

        // Kostas owns one small demo field so dual identity (Partner elsewhere, Admin here) is demonstrable.
        var partnerField = await fields.Find(f => f.Id == PartnerOwnedFieldId).FirstOrDefaultAsync(cancellationToken);
        if (partnerField == null)
        {
            await fields.InsertOneAsync(new FieldDocument
            {
                Id = PartnerOwnedFieldId,
                OwnerId = DemoFarmDataSeeder.ProducerId,
                Name = "Κτήμα Κώστα (Χώρα)",
                Area = 0.4,
                CropType = "Olive",
                Status = FieldStatus.Active,
                LocationText = "Χώρα Μεσσηνίας",
                Color = "#5B8C5A",
                Memberships =
                [
                    new FieldMembershipDocument
                    {
                        UserId = DemoFarmDataSeeder.ProducerId,
                        Role = "Admin",
                        Modules =
                        [
                            FamilyModules.Fields,
                            FamilyModules.Tasks,
                            FamilyModules.Documents,
                            FamilyModules.Money,
                            FamilyModules.Calendar,
                            FamilyModules.Harvest,
                        ],
                        AccessLevel = FamilyAccessLevels.Work,
                        Status = FamilyMemberStatuses.Active,
                        DisplayName = "Κώστας Μανούσακης",
                        Email = "producer1@olivefarm.com",
                        CreatedAt = now.AddDays(-30),
                    }
                ],
                CreatedAt = now.AddDays(-30),
                UpdatedAt = now,
            }, cancellationToken: cancellationToken);
        }

        logger.LogInformation(
            "Seeded partner seats: producer1 Partner on Filiatra fields + Admin on {PartnerField}.",
            PartnerOwnedFieldId);
    }
}
