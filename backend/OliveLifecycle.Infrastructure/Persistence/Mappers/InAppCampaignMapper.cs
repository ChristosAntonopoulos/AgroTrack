using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class InAppCampaignMapper
{
    public static InAppCampaign ToEntity(InAppCampaignDocument document) => new()
    {
        Id = document.Id,
        Kind = document.Kind,
        Status = document.Status,
        Title = ToLocalized(document.Title),
        Body = ToLocalized(document.Body),
        Placements = new CampaignPlacements
        {
            Inbox = document.Placements?.Inbox ?? true,
            Modal = document.Placements?.Modal ?? false
        },
        Priority = document.Priority,
        Audience = new CampaignAudience
        {
            Roles = document.Audience?.Roles?.ToList() ?? new List<string>()
        },
        StartsAt = document.StartsAt,
        EndsAt = document.EndsAt,
        ModalDismissible = document.ModalDismissible,
        PublishedAt = document.PublishedAt,
        Payload = ToPayload(document.Payload),
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static InAppCampaignDocument ToDocument(InAppCampaign entity) => new()
    {
        Id = entity.Id,
        Kind = entity.Kind,
        Status = entity.Status,
        Title = ToLocalizedDoc(entity.Title),
        Body = ToLocalizedDoc(entity.Body),
        Placements = new CampaignPlacementsDocument
        {
            Inbox = entity.Placements.Inbox,
            Modal = entity.Placements.Modal
        },
        Priority = entity.Priority,
        Audience = new CampaignAudienceDocument
        {
            Roles = entity.Audience.Roles?.ToList() ?? new List<string>()
        },
        StartsAt = entity.StartsAt,
        EndsAt = entity.EndsAt,
        ModalDismissible = entity.ModalDismissible,
        PublishedAt = entity.PublishedAt,
        Payload = ToPayloadDoc(entity.Payload),
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static CampaignEngagement ToEngagementEntity(CampaignEngagementDocument document) => new()
    {
        Id = document.Id,
        UserId = document.UserId,
        CampaignId = document.CampaignId,
        Status = document.Status,
        SeenAt = document.SeenAt,
        DismissedAt = document.DismissedAt,
        CompletedAt = document.CompletedAt,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static CampaignEngagementDocument ToEngagementDocument(CampaignEngagement entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        CampaignId = entity.CampaignId,
        Status = entity.Status,
        SeenAt = entity.SeenAt,
        DismissedAt = entity.DismissedAt,
        CompletedAt = entity.CompletedAt,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static CampaignAnswer ToAnswerEntity(CampaignAnswerDocument document) => new()
    {
        Id = document.Id,
        UserId = document.UserId,
        CampaignId = document.CampaignId,
        QuestionId = document.QuestionId,
        OptionIds = document.OptionIds?.ToList() ?? new List<string>(),
        TextValue = document.TextValue,
        UserDisplayName = document.UserDisplayName,
        UserRole = document.UserRole,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static CampaignAnswerDocument ToAnswerDocument(CampaignAnswer entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        CampaignId = entity.CampaignId,
        QuestionId = entity.QuestionId,
        OptionIds = entity.OptionIds?.ToList() ?? new List<string>(),
        TextValue = entity.TextValue,
        UserDisplayName = entity.UserDisplayName,
        UserRole = entity.UserRole,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    private static LocalizedText ToLocalized(LocalizedTextDocument? doc) => new()
    {
        En = doc?.En ?? string.Empty,
        El = doc?.El ?? string.Empty
    };

    private static LocalizedTextDocument ToLocalizedDoc(LocalizedText? text) => new()
    {
        En = text?.En ?? string.Empty,
        El = text?.El ?? string.Empty
    };

    private static CampaignPayload ToPayload(CampaignPayloadDocument? doc) => new()
    {
        CtaLabelEn = doc?.CtaLabelEn,
        CtaLabelEl = doc?.CtaLabelEl,
        CtaUrl = doc?.CtaUrl,
        ShowResultsAfterVote = doc?.ShowResultsAfterVote ?? false,
        Questions = (doc?.Questions ?? new List<CampaignQuestionDocument>()).Select(q => new CampaignQuestion
        {
            Id = q.Id,
            Type = q.Type,
            Prompt = ToLocalized(q.Prompt),
            Required = q.Required,
            Options = (q.Options ?? new List<CampaignOptionDocument>()).Select(o => new CampaignOption
            {
                Id = o.Id,
                Label = ToLocalized(o.Label)
            }).ToList()
        }).ToList()
    };

    private static CampaignPayloadDocument ToPayloadDoc(CampaignPayload? payload) => new()
    {
        CtaLabelEn = payload?.CtaLabelEn,
        CtaLabelEl = payload?.CtaLabelEl,
        CtaUrl = payload?.CtaUrl,
        ShowResultsAfterVote = payload?.ShowResultsAfterVote ?? false,
        Questions = (payload?.Questions ?? new List<CampaignQuestion>()).Select(q => new CampaignQuestionDocument
        {
            Id = q.Id,
            Type = q.Type,
            Prompt = ToLocalizedDoc(q.Prompt),
            Required = q.Required,
            Options = (q.Options ?? new List<CampaignOption>()).Select(o => new CampaignOptionDocument
            {
                Id = o.Id,
                Label = ToLocalizedDoc(o.Label)
            }).ToList()
        }).ToList()
    };
}
