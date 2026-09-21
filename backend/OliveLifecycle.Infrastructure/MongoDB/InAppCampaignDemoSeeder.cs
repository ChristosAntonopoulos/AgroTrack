using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>Seeds the olive fruit fly (δάκος) awareness questionnaire for demo/dev.</summary>
public static class InAppCampaignDemoSeeder
{
    public const string DacusCampaignId = "67d901c00000000000000001";

    public static async Task SeedAsync(
        MongoDbContext context,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var campaigns = context.GetCollection<InAppCampaignDocument>("in_app_campaigns");
        var existing = await campaigns.Find(c => c.Id == DacusCampaignId).FirstOrDefaultAsync(cancellationToken);
        if (existing != null)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var campaign = new InAppCampaign
        {
            Id = DacusCampaignId,
            Kind = CampaignKinds.Questionnaire,
            Status = CampaignStatuses.Published,
            Title = new LocalizedText
            {
                En = "Have you seen olive fruit fly?",
                El = "Έχετε δει δάκο;"
            },
            Body = new LocalizedText
            {
                En = "Help us track olive fruit fly (Bactrocera oleae) sightings in your grove this season.",
                El = "Βοηθήστε μας να καταγράψουμε εμφανίσεις δάκου στον ελαιώνα σας αυτή τη σεζόν."
            },
            Placements = new CampaignPlacements { Inbox = true, Modal = true },
            Priority = CampaignPriorities.High,
            Audience = new CampaignAudience
            {
                Roles = [Roles.FieldOwner, Roles.Producer]
            },
            StartsAt = now.AddDays(-7),
            EndsAt = now.AddMonths(6),
            ModalDismissible = true,
            PublishedAt = now.AddDays(-1),
            Payload = new CampaignPayload
            {
                Questions =
                [
                    new CampaignQuestion
                    {
                        Id = "dacus-seen",
                        Type = CampaignQuestionTypes.YesNo,
                        Required = true,
                        Prompt = new LocalizedText
                        {
                            En = "Have you seen olive fruit fly (δάκος) in your fields recently?",
                            El = "Έχετε δει δάκο στους ελαιώνες σας πρόσφατα;"
                        },
                        Options =
                        [
                            new CampaignOption
                            {
                                Id = "yes",
                                Label = new LocalizedText { En = "Yes", El = "Ναι" }
                            },
                            new CampaignOption
                            {
                                Id = "no",
                                Label = new LocalizedText { En = "No", El = "Όχι" }
                            }
                        ]
                    }
                ]
            },
            CreatedAt = now.AddDays(-1),
            UpdatedAt = now
        };

        await campaigns.InsertOneAsync(InAppCampaignMapper.ToDocument(campaign), cancellationToken: cancellationToken);
        logger.LogInformation("Seeded in-app campaign: olive fruit fly (δάκος) questionnaire.");
    }
}
