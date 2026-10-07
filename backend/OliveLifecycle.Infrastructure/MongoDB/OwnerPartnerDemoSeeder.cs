using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Core;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Phase 4: seat Kostas as Partner (work) on both ελαιώνες and record partner acceptance.
/// </summary>
public static class OwnerPartnerDemoSeeder
{
    public const string PartnerOwnedFieldId = DemoFarmDataSeeder.PartnerOwnedFieldId;
    private const string PartnerAcceptedActivityId = "67555555555555555555a201";

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
        var seated = 0;
        var acceptedAt = new DateTime(now.Date.AddDays(-7).Year, 2, 12, 9, 0, 0, DateTimeKind.Utc);

        foreach (var fieldId in DemoFarmDataSeeder.FieldIds)
        {
            var field = await fields.Find(f => f.Id == fieldId).FirstOrDefaultAsync(cancellationToken);
            if (field == null) continue;

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
                    Email = DemoFarmDataSeeder.PartnerEmail,
                    CreatedAt = acceptedAt,
                });
            }
            else
            {
                seat.Role = "Partner";
                seat.Modules = DemoFarmDataSeeder.PartnerSeatModules.ToList();
                seat.AccessLevel = FamilyAccessLevels.Work;
                seat.Status = FamilyMemberStatuses.Active;
                seat.DisplayName = DemoFarmDataSeeder.PartnerDisplayName;
                seat.Email = DemoFarmDataSeeder.PartnerEmail;
            }

            await fields.ReplaceOneAsync(f => f.Id == fieldId, field, cancellationToken: cancellationToken);
            seated++;
        }

        await context.GetCollection<ActivityDocument>("activities").ReplaceOneAsync(
            a => a.Id == PartnerAcceptedActivityId,
            new ActivityDocument
            {
                Id = PartnerAcceptedActivityId,
                FieldId = DemoFarmDataSeeder.FieldId,
                Type = "partner_contact_accepted",
                Message = "Ο Κώστας δουλεύει μαζί μας",
                ActorUserId = DemoFarmDataSeeder.ProducerId,
                Timestamp = acceptedAt,
                Metadata = new Dictionary<string, string>
                {
                    ["producerId"] = DemoFarmDataSeeder.ProducerId,
                },
            },
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);

        logger.LogInformation(
            "Phase 4: partner seat for {Email} (work) on {Count} ελαιώνες.",
            DemoFarmDataSeeder.PartnerEmail,
            seated);
    }
}
