using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class InAppCampaignDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("kind")]
    public string Kind { get; set; } = "announcement";

    [BsonElement("status")]
    public string Status { get; set; } = "draft";

    [BsonElement("title")]
    public LocalizedTextDocument Title { get; set; } = new();

    [BsonElement("body")]
    public LocalizedTextDocument Body { get; set; } = new();

    [BsonElement("placements")]
    public CampaignPlacementsDocument Placements { get; set; } = new();

    [BsonElement("priority")]
    public string Priority { get; set; } = "medium";

    [BsonElement("audience")]
    public CampaignAudienceDocument Audience { get; set; } = new();

    [BsonElement("startsAt")]
    public DateTime? StartsAt { get; set; }

    [BsonElement("endsAt")]
    public DateTime? EndsAt { get; set; }

    [BsonElement("modalDismissible")]
    public bool ModalDismissible { get; set; } = true;

    [BsonElement("publishedAt")]
    public DateTime? PublishedAt { get; set; }

    [BsonElement("payload")]
    public CampaignPayloadDocument Payload { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class LocalizedTextDocument
{
    [BsonElement("en")]
    public string En { get; set; } = string.Empty;

    [BsonElement("el")]
    public string El { get; set; } = string.Empty;
}

public class CampaignPlacementsDocument
{
    [BsonElement("inbox")]
    public bool Inbox { get; set; } = true;

    [BsonElement("modal")]
    public bool Modal { get; set; }
}

public class CampaignAudienceDocument
{
    [BsonElement("roles")]
    public List<string> Roles { get; set; } = new();
}

public class CampaignPayloadDocument
{
    [BsonElement("ctaLabelEn")]
    public string? CtaLabelEn { get; set; }

    [BsonElement("ctaLabelEl")]
    public string? CtaLabelEl { get; set; }

    [BsonElement("ctaUrl")]
    public string? CtaUrl { get; set; }

    [BsonElement("showResultsAfterVote")]
    public bool ShowResultsAfterVote { get; set; }

    [BsonElement("questions")]
    public List<CampaignQuestionDocument> Questions { get; set; } = new();
}

public class CampaignQuestionDocument
{
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    [BsonElement("type")]
    public string Type { get; set; } = "yes_no";

    [BsonElement("prompt")]
    public LocalizedTextDocument Prompt { get; set; } = new();

    [BsonElement("required")]
    public bool Required { get; set; } = true;

    [BsonElement("options")]
    public List<CampaignOptionDocument> Options { get; set; } = new();
}

public class CampaignOptionDocument
{
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    [BsonElement("label")]
    public LocalizedTextDocument Label { get; set; } = new();
}

public class CampaignEngagementDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("campaignId")]
    public string CampaignId { get; set; } = string.Empty;

    [BsonElement("status")]
    public string Status { get; set; } = "delivered";

    [BsonElement("seenAt")]
    public DateTime? SeenAt { get; set; }

    [BsonElement("dismissedAt")]
    public DateTime? DismissedAt { get; set; }

    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class CampaignAnswerDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("campaignId")]
    public string CampaignId { get; set; } = string.Empty;

    [BsonElement("questionId")]
    public string QuestionId { get; set; } = string.Empty;

    [BsonElement("optionIds")]
    public List<string> OptionIds { get; set; } = new();

    [BsonElement("textValue")]
    public string? TextValue { get; set; }

    [BsonElement("userDisplayName")]
    public string? UserDisplayName { get; set; }

    [BsonElement("userRole")]
    public string? UserRole { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
