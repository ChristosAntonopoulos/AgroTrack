using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Core;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Phase 4: seat Eleni as Family (view) on both ελαιώνες and add her house-oil note.
/// </summary>
public static class FamilyDemoSeeder
{
    private const string HouseOilNoteId = "675555555555555555557e01";

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

        foreach (var fieldId in DemoFarmDataSeeder.FieldIds)
        {
            var field = await fields.Find(f => f.Id == fieldId).FirstOrDefaultAsync(cancellationToken);
            if (field == null) continue;

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
                    Modules = DemoFarmDataSeeder.FamilySeatModules.ToList(),
                    AccessLevel = FamilyAccessLevels.View,
                    Status = FamilyMemberStatuses.Active,
                    InvitedBy = DemoFarmDataSeeder.OwnerId,
                    DisplayName = DemoFarmDataSeeder.FamilyDisplayName,
                    Email = "family@olivefarm.com",
                    CreatedAt = now.AddDays(-180),
                });
            }
            else
            {
                existing.Role = "Family";
                existing.UserId = DemoFarmDataSeeder.FamilyUserId;
                existing.Modules = DemoFarmDataSeeder.FamilySeatModules.ToList();
                existing.AccessLevel = FamilyAccessLevels.View;
                existing.DisplayName = DemoFarmDataSeeder.FamilyDisplayName;
                existing.Status = FamilyMemberStatuses.Active;
            }

            await fields.ReplaceOneAsync(f => f.Id == fieldId, field, cancellationToken: cancellationToken);
            seated++;
        }

        var noteWhen = DateTime.UtcNow.Date.AddDays(-2).AddHours(16);
        await context.GetCollection<NoteDocument>("notes").ReplaceOneAsync(
            n => n.Id == HouseOilNoteId,
            new NoteDocument
            {
                Id = HouseOilNoteId,
                OwnerUserId = DemoFarmDataSeeder.FamilyUserId,
                Body = "Κρατήσαμε λάδι για το σπίτι. Όπως κάθε χρόνο.",
                FieldId = DemoFarmDataSeeder.FieldId,
                Pinned = false,
                OccurredAt = noteWhen,
                CreatedAt = noteWhen,
                UpdatedAt = noteWhen,
            },
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);

        logger.LogInformation(
            "Phase 4: family seat for {Email} (view) on {Count} ελαιώνες, plus house-oil note.",
            "family@olivefarm.com",
            seated);
    }
}
