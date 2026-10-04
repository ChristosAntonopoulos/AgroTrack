namespace OliveLifecycle.Application.DTOs.Campaigns;

public class LocalizedTextDto
{
    public string En { get; set; } = string.Empty;
    public string El { get; set; } = string.Empty;
}

public class CampaignPlacementsDto
{
    public bool Inbox { get; set; } = true;
    public bool Modal { get; set; }
}

public class CampaignAudienceDto
{
    public List<string> Roles { get; set; } = new();
}

public class CampaignOptionDto
{
    public string Id { get; set; } = string.Empty;
    public LocalizedTextDto Label { get; set; } = new();
}

public class CampaignQuestionDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = "yes_no";
    public LocalizedTextDto Prompt { get; set; } = new();
    public bool Required { get; set; } = true;
    public List<CampaignOptionDto> Options { get; set; } = new();
}

public class CampaignPayloadDto
{
    public string? CtaLabelEn { get; set; }
    public string? CtaLabelEl { get; set; }
    public string? CtaUrl { get; set; }
    public bool ShowResultsAfterVote { get; set; }
    public List<CampaignQuestionDto> Questions { get; set; } = new();
}

public class InAppCampaignDto
{
    public string Id { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public LocalizedTextDto Title { get; set; } = new();
    public LocalizedTextDto Body { get; set; } = new();
    public CampaignPlacementsDto Placements { get; set; } = new();
    public string Priority { get; set; } = "medium";
    public CampaignAudienceDto Audience { get; set; } = new();
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public bool ModalDismissible { get; set; } = true;
    public DateTime? PublishedAt { get; set; }
    public CampaignPayloadDto Payload { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpsertInAppCampaignDto
{
    public string Kind { get; set; } = "announcement";
    public LocalizedTextDto Title { get; set; } = new();
    public LocalizedTextDto Body { get; set; } = new();
    public CampaignPlacementsDto Placements { get; set; } = new();
    public string Priority { get; set; } = "medium";
    public CampaignAudienceDto Audience { get; set; } = new();
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public bool ModalDismissible { get; set; } = true;
    public CampaignPayloadDto Payload { get; set; } = new();
}

public class InboxItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Source { get; set; } = "transactional";
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public string? RelatedEntityId { get; set; }
    public string? RelatedEntityType { get; set; }
    public string? CampaignId { get; set; }
    public string? CampaignKind { get; set; }
    public bool IsRead { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class InAppMessageDto
{
    public string Id { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public string Priority { get; set; } = "medium";
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool ModalDismissible { get; set; } = true;
    public string? CtaLabel { get; set; }
    public string? CtaUrl { get; set; }
    public bool ShowResultsAfterVote { get; set; }
    public List<InAppMessageQuestionDto> Questions { get; set; } = new();
    public string EngagementStatus { get; set; } = "delivered";
    public bool HasResponded { get; set; }
    public List<PollResultOptionDto>? PollResults { get; set; }
}

public class InAppMessageQuestionDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = "yes_no";
    public string Prompt { get; set; } = string.Empty;
    public bool Required { get; set; } = true;
    public List<InAppMessageOptionDto> Options { get; set; } = new();
    public List<string>? SelectedOptionIds { get; set; }
    public string? TextValue { get; set; }
}

public class InAppMessageOptionDto
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class RespondInAppMessageDto
{
    public List<RespondAnswerDto> Answers { get; set; } = new();
}

public class RespondAnswerDto
{
    public string QuestionId { get; set; } = string.Empty;
    public List<string>? OptionIds { get; set; }
    public string? TextValue { get; set; }
}

public class PollResultOptionDto
{
    public string OptionId { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class CampaignResponsesDto
{
    public string CampaignId { get; set; } = string.Empty;
    public int DeliveredCount { get; set; }
    public int SeenCount { get; set; }
    public int DismissedCount { get; set; }
    public int CompletedCount { get; set; }
    public List<QuestionTallyDto> QuestionTallies { get; set; } = new();
    public List<RecentAnswerDto> RecentAnswers { get; set; } = new();
}

public class QuestionTallyDto
{
    public string QuestionId { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public List<OptionTallyDto> Options { get; set; } = new();
    public int TextAnswerCount { get; set; }
}

public class OptionTallyDto
{
    public string OptionId { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class RecentAnswerDto
{
    public string UserDisplayName { get; set; } = string.Empty;
    public string? UserRole { get; set; }
    public string QuestionId { get; set; } = string.Empty;
    public List<string> OptionIds { get; set; } = new();
    public string? TextValue { get; set; }
    public DateTime SubmittedAt { get; set; }
}
