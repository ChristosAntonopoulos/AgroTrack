namespace OliveLifecycle.Core.Entities;

/// <summary>Broadcast in-app message: announcement, questionnaire, or poll.</summary>
public class InAppCampaign : BaseEntity
{
    public string Kind { get; set; } = CampaignKinds.Announcement;
    public string Status { get; set; } = CampaignStatuses.Draft;
    public LocalizedText Title { get; set; } = new();
    public LocalizedText Body { get; set; } = new();
    public CampaignPlacements Placements { get; set; } = new();
    public string Priority { get; set; } = CampaignPriorities.Medium;
    public CampaignAudience Audience { get; set; } = new();
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public bool ModalDismissible { get; set; } = true;
    public DateTime? PublishedAt { get; set; }
    public CampaignPayload Payload { get; set; } = new();
}

public class LocalizedText
{
    public string En { get; set; } = string.Empty;
    public string El { get; set; } = string.Empty;
}

public class CampaignPlacements
{
    public bool Inbox { get; set; } = true;
    public bool Modal { get; set; }
}

public class CampaignAudience
{
    /// <summary>Empty = all authenticated roles.</summary>
    public List<string> Roles { get; set; } = new();
}

public class CampaignPayload
{
    public string? CtaLabelEn { get; set; }
    public string? CtaLabelEl { get; set; }
    public string? CtaUrl { get; set; }
    public bool ShowResultsAfterVote { get; set; }
    public List<CampaignQuestion> Questions { get; set; } = new();
}

public class CampaignQuestion
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = CampaignQuestionTypes.YesNo;
    public LocalizedText Prompt { get; set; } = new();
    public bool Required { get; set; } = true;
    public List<CampaignOption> Options { get; set; } = new();
}

public class CampaignOption
{
    public string Id { get; set; } = string.Empty;
    public LocalizedText Label { get; set; } = new();
}

public static class CampaignKinds
{
    public const string Announcement = "announcement";
    public const string Questionnaire = "questionnaire";
    public const string Poll = "poll";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Announcement, Questionnaire, Poll
    };
}

public static class CampaignStatuses
{
    public const string Draft = "draft";
    public const string Published = "published";
    public const string Archived = "archived";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Draft, Published, Archived
    };
}

public static class CampaignPriorities
{
    public const string Critical = "critical";
    public const string High = "high";
    public const string Medium = "medium";
    public const string Low = "low";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Critical, High, Medium, Low
    };

    public static int Rank(string priority) => priority?.ToLowerInvariant() switch
    {
        Critical => 0,
        High => 1,
        Medium => 2,
        Low => 3,
        _ => 4
    };
}

public static class CampaignQuestionTypes
{
    public const string YesNo = "yes_no";
    public const string Single = "single";
    public const string Multi = "multi";
    public const string ShortText = "short_text";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        YesNo, Single, Multi, ShortText
    };
}

public static class CampaignEngagementStatuses
{
    public const string Delivered = "delivered";
    public const string Seen = "seen";
    public const string Dismissed = "dismissed";
    public const string Completed = "completed";
}

/// <summary>Per-user state for a campaign.</summary>
public class CampaignEngagement : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string CampaignId { get; set; } = string.Empty;
    public string Status { get; set; } = CampaignEngagementStatuses.Delivered;
    public DateTime? SeenAt { get; set; }
    public DateTime? DismissedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

/// <summary>One answer to one question in a campaign.</summary>
public class CampaignAnswer : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string CampaignId { get; set; } = string.Empty;
    public string QuestionId { get; set; } = string.Empty;
    public List<string> OptionIds { get; set; } = new();
    public string? TextValue { get; set; }
    public string? UserDisplayName { get; set; }
    public string? UserRole { get; set; }
}
