using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Campaigns;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class AdminCampaignService : IAdminCampaignService
{
    private readonly IInAppCampaignRepository _campaigns;
    private readonly ICampaignEngagementRepository _engagements;
    private readonly ICampaignAnswerRepository _answers;
    private readonly IDateTimeProvider _clock;

    public AdminCampaignService(
        IInAppCampaignRepository campaigns,
        ICampaignEngagementRepository engagements,
        ICampaignAnswerRepository answers,
        IDateTimeProvider clock)
    {
        _campaigns = campaigns;
        _engagements = engagements;
        _answers = answers;
        _clock = clock;
    }

    public async Task<IReadOnlyList<InAppCampaignDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        var items = await _campaigns.GetAllAsync(cancellationToken);
        return items.Select(CampaignMapping.ToDto).ToList();
    }

    public async Task<InAppCampaignDto?> GetAsync(string id, CancellationToken cancellationToken = default)
    {
        var item = await _campaigns.GetByIdAsync(id, cancellationToken);
        return item == null ? null : CampaignMapping.ToDto(item);
    }

    public async Task<InAppCampaignDto> CreateAsync(
        UpsertInAppCampaignDto request,
        CancellationToken cancellationToken = default)
    {
        var entity = CampaignMapping.FromUpsert(request);
        CampaignValidation.ValidateForSave(entity);
        entity.Status = CampaignStatuses.Draft;
        var created = await _campaigns.CreateAsync(entity, cancellationToken);
        return CampaignMapping.ToDto(created);
    }

    public async Task<InAppCampaignDto> UpdateAsync(
        string id,
        UpsertInAppCampaignDto request,
        CancellationToken cancellationToken = default)
    {
        var existing = await _campaigns.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Campaign not found.");

        if (string.Equals(existing.Status, CampaignStatuses.Archived, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("Archived campaigns cannot be edited.");
        }

        CampaignMapping.ApplyUpsert(existing, request);
        CampaignValidation.ValidateForSave(existing);
        var updated = await _campaigns.UpdateAsync(existing, cancellationToken);
        return CampaignMapping.ToDto(updated);
    }

    public async Task<InAppCampaignDto> PublishAsync(string id, CancellationToken cancellationToken = default)
    {
        var existing = await _campaigns.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Campaign not found.");

        CampaignValidation.ValidateForSave(existing);
        if (!existing.Placements.Inbox && !existing.Placements.Modal)
        {
            throw new ValidationException("Select at least one placement (inbox or modal).");
        }

        existing.Status = CampaignStatuses.Published;
        existing.PublishedAt = _clock.UtcNow;
        var updated = await _campaigns.UpdateAsync(existing, cancellationToken);
        return CampaignMapping.ToDto(updated);
    }

    public async Task<InAppCampaignDto> ArchiveAsync(string id, CancellationToken cancellationToken = default)
    {
        var existing = await _campaigns.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Campaign not found.");

        existing.Status = CampaignStatuses.Archived;
        var updated = await _campaigns.UpdateAsync(existing, cancellationToken);
        return CampaignMapping.ToDto(updated);
    }

    public async Task<CampaignResponsesDto> GetResponsesAsync(
        string id,
        CancellationToken cancellationToken = default)
    {
        var campaign = await _campaigns.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Campaign not found.");

        var engagements = await _engagements.GetByCampaignAsync(id, cancellationToken);
        var answers = await _answers.GetByCampaignAsync(id, cancellationToken);

        var tallies = campaign.Payload.Questions.Select(q =>
        {
            var questionAnswers = answers.Where(a => a.QuestionId == q.Id).ToList();
            var optionTallies = q.Options.Select(o => new OptionTallyDto
            {
                OptionId = o.Id,
                Label = PreferEl(o.Label),
                Count = questionAnswers.Count(a => a.OptionIds.Contains(o.Id, StringComparer.Ordinal))
            }).ToList();

            return new QuestionTallyDto
            {
                QuestionId = q.Id,
                Prompt = PreferEl(q.Prompt),
                Type = q.Type,
                Options = optionTallies,
                TextAnswerCount = questionAnswers.Count(a => !string.IsNullOrWhiteSpace(a.TextValue))
            };
        }).ToList();

        var recent = answers
            .OrderByDescending(a => a.CreatedAt)
            .Take(40)
            .Select(a => new RecentAnswerDto
            {
                UserDisplayName = a.UserDisplayName ?? a.UserId,
                UserRole = a.UserRole,
                QuestionId = a.QuestionId,
                OptionIds = a.OptionIds,
                TextValue = a.TextValue,
                SubmittedAt = a.CreatedAt
            })
            .ToList();

        return new CampaignResponsesDto
        {
            CampaignId = id,
            DeliveredCount = engagements.Count,
            SeenCount = engagements.Count(e =>
                e.SeenAt != null
                || string.Equals(e.Status, CampaignEngagementStatuses.Seen, StringComparison.OrdinalIgnoreCase)
                || string.Equals(e.Status, CampaignEngagementStatuses.Dismissed, StringComparison.OrdinalIgnoreCase)
                || string.Equals(e.Status, CampaignEngagementStatuses.Completed, StringComparison.OrdinalIgnoreCase)),
            DismissedCount = engagements.Count(e =>
                string.Equals(e.Status, CampaignEngagementStatuses.Dismissed, StringComparison.OrdinalIgnoreCase)),
            CompletedCount = engagements.Count(e =>
                string.Equals(e.Status, CampaignEngagementStatuses.Completed, StringComparison.OrdinalIgnoreCase)),
            QuestionTallies = tallies,
            RecentAnswers = recent
        };
    }

    private static string PreferEl(LocalizedText text) =>
        !string.IsNullOrWhiteSpace(text.El) ? text.El : text.En;
}

public class InAppMessageService : IInAppMessageService
{
    private readonly IInAppCampaignRepository _campaigns;
    private readonly ICampaignEngagementRepository _engagements;
    private readonly ICampaignAnswerRepository _answers;
    private readonly IUserNotificationRepository _notifications;
    private readonly IDateTimeProvider _clock;

    public InAppMessageService(
        IInAppCampaignRepository campaigns,
        ICampaignEngagementRepository engagements,
        ICampaignAnswerRepository answers,
        IUserNotificationRepository notifications,
        IDateTimeProvider clock)
    {
        _campaigns = campaigns;
        _engagements = engagements;
        _answers = answers;
        _notifications = notifications;
        _clock = clock;
    }

    public async Task<IReadOnlyList<InboxItemDto>> GetInboxAsync(
        string userId,
        string role,
        string locale,
        CancellationToken cancellationToken = default)
    {
        var now = _clock.UtcNow;
        var transactional = await _notifications.GetByUserIdAsync(userId, 50, cancellationToken);
        var campaigns = await _campaigns.GetPublishedActiveAsync(now, cancellationToken);
        var engagements = await _engagements.GetByUserAsync(userId, cancellationToken);
        var engagementByCampaign = engagements.ToDictionary(e => e.CampaignId, StringComparer.Ordinal);

        var items = new List<InboxItemDto>();

        foreach (var n in transactional)
        {
            items.Add(new InboxItemDto
            {
                Id = n.Id,
                Source = "transactional",
                Type = n.Type,
                Title = n.Title,
                Message = n.Message,
                ActionUrl = n.ActionUrl,
                RelatedEntityId = n.RelatedEntityId,
                RelatedEntityType = n.RelatedEntityType,
                IsRead = n.IsRead,
                IsCompleted = n.IsRead,
                CreatedAt = n.CreatedAt
            });
        }

        foreach (var campaign in campaigns.Where(c => c.Placements.Inbox && MatchesAudience(c, role)))
        {
            engagementByCampaign.TryGetValue(campaign.Id, out var engagement);
            var completed = IsCompleted(engagement);
            var dismissed = IsDismissed(engagement);
            var seen = IsSeen(engagement);

            items.Add(new InboxItemDto
            {
                Id = $"campaign:{campaign.Id}",
                Source = "campaign",
                Type = campaign.Kind,
                Title = Localize(campaign.Title, locale),
                Message = Localize(campaign.Body, locale),
                CampaignId = campaign.Id,
                CampaignKind = campaign.Kind,
                IsRead = completed || dismissed || seen,
                IsCompleted = completed,
                CreatedAt = campaign.PublishedAt ?? campaign.CreatedAt
            });
        }

        return items.OrderByDescending(i => i.CreatedAt).ToList();
    }

    public async Task<IReadOnlyList<InAppMessageDto>> GetPendingModalsAsync(
        string userId,
        string role,
        string locale,
        CancellationToken cancellationToken = default)
    {
        var now = _clock.UtcNow;
        var campaigns = await _campaigns.GetPublishedActiveAsync(now, cancellationToken);
        var engagements = await _engagements.GetByUserAsync(userId, cancellationToken);
        var engagementByCampaign = engagements.ToDictionary(e => e.CampaignId, StringComparer.Ordinal);

        var pending = new List<(InAppCampaign Campaign, CampaignEngagement? Engagement)>();
        foreach (var campaign in campaigns.Where(c => c.Placements.Modal && MatchesAudience(c, role)))
        {
            engagementByCampaign.TryGetValue(campaign.Id, out var engagement);
            if (IsCompleted(engagement) || IsDismissed(engagement))
            {
                continue;
            }

            pending.Add((campaign, engagement));
        }

        pending = pending
            .OrderBy(p => CampaignPriorities.Rank(p.Campaign.Priority))
            .ThenByDescending(p => p.Campaign.PublishedAt ?? p.Campaign.CreatedAt)
            .ToList();

        var result = new List<InAppMessageDto>();
        foreach (var (campaign, engagement) in pending)
        {
            result.Add(await ToMessageDtoAsync(campaign, userId, role, locale, engagement, cancellationToken));
        }

        return result;
    }

    public async Task<InAppMessageDto> GetMessageAsync(
        string campaignId,
        string userId,
        string role,
        string locale,
        CancellationToken cancellationToken = default)
    {
        var campaign = await RequireAudienceCampaignAsync(campaignId, role, cancellationToken);
        var engagement = await _engagements.GetAsync(userId, campaignId, cancellationToken);
        return await ToMessageDtoAsync(campaign, userId, role, locale, engagement, cancellationToken);
    }

    public async Task MarkSeenAsync(
        string campaignId,
        string userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        await RequireAudienceCampaignAsync(campaignId, role, cancellationToken);
        var engagement = await _engagements.GetAsync(userId, campaignId, cancellationToken)
            ?? new CampaignEngagement
            {
                UserId = userId,
                CampaignId = campaignId,
                Status = CampaignEngagementStatuses.Delivered
            };

        if (IsCompleted(engagement) || IsDismissed(engagement))
        {
            return;
        }

        engagement.Status = CampaignEngagementStatuses.Seen;
        engagement.SeenAt ??= _clock.UtcNow;
        await _engagements.UpsertAsync(engagement, cancellationToken);
    }

    public async Task DismissAsync(
        string campaignId,
        string userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var campaign = await RequireAudienceCampaignAsync(campaignId, role, cancellationToken);
        if (!campaign.ModalDismissible)
        {
            throw new ValidationException("This message cannot be dismissed.");
        }

        var engagement = await _engagements.GetAsync(userId, campaignId, cancellationToken)
            ?? new CampaignEngagement
            {
                UserId = userId,
                CampaignId = campaignId,
                Status = CampaignEngagementStatuses.Delivered
            };

        if (IsCompleted(engagement))
        {
            return;
        }

        engagement.Status = CampaignEngagementStatuses.Dismissed;
        engagement.DismissedAt = _clock.UtcNow;
        engagement.SeenAt ??= _clock.UtcNow;
        await _engagements.UpsertAsync(engagement, cancellationToken);
    }

    public async Task<InAppMessageDto> RespondAsync(
        string campaignId,
        string userId,
        string role,
        string? displayName,
        string locale,
        RespondInAppMessageDto request,
        CancellationToken cancellationToken = default)
    {
        var campaign = await RequireAudienceCampaignAsync(campaignId, role, cancellationToken);
        if (string.Equals(campaign.Kind, CampaignKinds.Announcement, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("Announcements do not accept answers.");
        }

        var existing = await _engagements.GetAsync(userId, campaignId, cancellationToken);
        if (IsCompleted(existing))
        {
            throw new ValidationException("You have already responded to this message.");
        }

        CampaignValidation.ValidateAnswers(campaign, request.Answers ?? new List<RespondAnswerDto>());

        foreach (var answer in request.Answers)
        {
            await _answers.UpsertAsync(new CampaignAnswer
            {
                UserId = userId,
                CampaignId = campaignId,
                QuestionId = answer.QuestionId,
                OptionIds = answer.OptionIds?.Distinct(StringComparer.Ordinal).ToList() ?? new List<string>(),
                TextValue = string.IsNullOrWhiteSpace(answer.TextValue) ? null : answer.TextValue.Trim(),
                UserDisplayName = displayName,
                UserRole = role
            }, cancellationToken);
        }

        var engagement = existing ?? new CampaignEngagement
        {
            UserId = userId,
            CampaignId = campaignId
        };
        engagement.Status = CampaignEngagementStatuses.Completed;
        engagement.CompletedAt = _clock.UtcNow;
        engagement.SeenAt ??= _clock.UtcNow;
        await _engagements.UpsertAsync(engagement, cancellationToken);

        return await ToMessageDtoAsync(campaign, userId, role, locale, engagement, cancellationToken);
    }

    private async Task<InAppCampaign> RequireAudienceCampaignAsync(
        string campaignId,
        string role,
        CancellationToken cancellationToken)
    {
        var campaign = await _campaigns.GetByIdAsync(campaignId, cancellationToken)
            ?? throw new NotFoundException("Campaign not found.");

        if (!string.Equals(campaign.Status, CampaignStatuses.Published, StringComparison.OrdinalIgnoreCase))
        {
            throw new NotFoundException("Campaign not found.");
        }

        var now = _clock.UtcNow;
        if (campaign.StartsAt is { } start && start > now)
        {
            throw new NotFoundException("Campaign not found.");
        }

        if (campaign.EndsAt is { } end && end < now)
        {
            throw new NotFoundException("Campaign not found.");
        }

        if (!MatchesAudience(campaign, role))
        {
            throw new ForbiddenException("You do not have access to this campaign.");
        }

        return campaign;
    }

    private async Task<InAppMessageDto> ToMessageDtoAsync(
        InAppCampaign campaign,
        string userId,
        string role,
        string locale,
        CampaignEngagement? engagement,
        CancellationToken cancellationToken)
    {
        var userAnswers = await _answers.GetByUserAndCampaignAsync(userId, campaign.Id, cancellationToken);
        var answerByQuestion = userAnswers.ToDictionary(a => a.QuestionId, StringComparer.Ordinal);
        var completed = IsCompleted(engagement);

        List<PollResultOptionDto>? pollResults = null;
        if (completed
            && string.Equals(campaign.Kind, CampaignKinds.Poll, StringComparison.OrdinalIgnoreCase)
            && campaign.Payload.ShowResultsAfterVote
            && campaign.Payload.Questions.Count > 0)
        {
            var question = campaign.Payload.Questions[0];
            var allAnswers = await _answers.GetByCampaignAsync(campaign.Id, cancellationToken);
            pollResults = question.Options.Select(o => new PollResultOptionDto
            {
                OptionId = o.Id,
                Label = Localize(o.Label, locale),
                Count = allAnswers.Count(a =>
                    a.QuestionId == question.Id
                    && a.OptionIds.Contains(o.Id, StringComparer.Ordinal))
            }).ToList();
        }

        return new InAppMessageDto
        {
            Id = campaign.Id,
            Kind = campaign.Kind,
            Priority = campaign.Priority,
            Title = Localize(campaign.Title, locale),
            Body = Localize(campaign.Body, locale),
            ModalDismissible = campaign.ModalDismissible,
            CtaLabel = locale.StartsWith("el", StringComparison.OrdinalIgnoreCase)
                ? (campaign.Payload.CtaLabelEl ?? campaign.Payload.CtaLabelEn)
                : (campaign.Payload.CtaLabelEn ?? campaign.Payload.CtaLabelEl),
            CtaUrl = campaign.Payload.CtaUrl,
            ShowResultsAfterVote = campaign.Payload.ShowResultsAfterVote,
            EngagementStatus = engagement?.Status ?? CampaignEngagementStatuses.Delivered,
            HasResponded = completed,
            PollResults = pollResults,
            Questions = campaign.Payload.Questions.Select(q =>
            {
                answerByQuestion.TryGetValue(q.Id, out var answer);
                return new InAppMessageQuestionDto
                {
                    Id = q.Id,
                    Type = q.Type,
                    Prompt = Localize(q.Prompt, locale),
                    Required = q.Required,
                    Options = q.Options.Select(o => new InAppMessageOptionDto
                    {
                        Id = o.Id,
                        Label = Localize(o.Label, locale)
                    }).ToList(),
                    SelectedOptionIds = answer?.OptionIds,
                    TextValue = answer?.TextValue
                };
            }).ToList()
        };
    }

    private static bool MatchesAudience(InAppCampaign campaign, string role)
    {
        var roles = campaign.Audience.Roles;
        if (roles == null || roles.Count == 0)
        {
            return true;
        }

        return roles.Any(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsCompleted(CampaignEngagement? engagement) =>
        engagement != null
        && string.Equals(engagement.Status, CampaignEngagementStatuses.Completed, StringComparison.OrdinalIgnoreCase);

    private static bool IsDismissed(CampaignEngagement? engagement) =>
        engagement != null
        && string.Equals(engagement.Status, CampaignEngagementStatuses.Dismissed, StringComparison.OrdinalIgnoreCase);

    private static bool IsSeen(CampaignEngagement? engagement) =>
        engagement != null
        && (engagement.SeenAt != null
            || string.Equals(engagement.Status, CampaignEngagementStatuses.Seen, StringComparison.OrdinalIgnoreCase));

    private static string Localize(LocalizedText text, string locale)
    {
        if (locale.StartsWith("el", StringComparison.OrdinalIgnoreCase))
        {
            return !string.IsNullOrWhiteSpace(text.El) ? text.El : text.En;
        }

        return !string.IsNullOrWhiteSpace(text.En) ? text.En : text.El;
    }
}

internal static class CampaignMapping
{
    public static InAppCampaignDto ToDto(InAppCampaign entity) => new()
    {
        Id = entity.Id,
        Kind = entity.Kind,
        Status = entity.Status,
        Title = ToLocalizedDto(entity.Title),
        Body = ToLocalizedDto(entity.Body),
        Placements = new CampaignPlacementsDto
        {
            Inbox = entity.Placements.Inbox,
            Modal = entity.Placements.Modal
        },
        Priority = entity.Priority,
        Audience = new CampaignAudienceDto
        {
            Roles = entity.Audience.Roles?.ToList() ?? new List<string>()
        },
        StartsAt = entity.StartsAt,
        EndsAt = entity.EndsAt,
        ModalDismissible = entity.ModalDismissible,
        PublishedAt = entity.PublishedAt,
        Payload = ToPayloadDto(entity.Payload),
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static InAppCampaign FromUpsert(UpsertInAppCampaignDto request)
    {
        var entity = new InAppCampaign();
        ApplyUpsert(entity, request);
        return entity;
    }

    public static void ApplyUpsert(InAppCampaign entity, UpsertInAppCampaignDto request)
    {
        entity.Kind = request.Kind?.Trim().ToLowerInvariant() ?? CampaignKinds.Announcement;
        entity.Title = FromLocalizedDto(request.Title);
        entity.Body = FromLocalizedDto(request.Body);
        entity.Placements = new CampaignPlacements
        {
            Inbox = request.Placements?.Inbox ?? true,
            Modal = request.Placements?.Modal ?? false
        };
        entity.Priority = request.Priority?.Trim().ToLowerInvariant() ?? CampaignPriorities.Medium;
        entity.Audience = new CampaignAudience
        {
            Roles = request.Audience?.Roles?.Where(r => !string.IsNullOrWhiteSpace(r)).Distinct(StringComparer.OrdinalIgnoreCase).ToList()
                ?? new List<string>()
        };
        entity.StartsAt = request.StartsAt;
        entity.EndsAt = request.EndsAt;
        entity.ModalDismissible = request.ModalDismissible;
        entity.Payload = FromPayloadDto(request.Payload);
        EnsureQuestionIds(entity);
    }

    private static void EnsureQuestionIds(InAppCampaign entity)
    {
        foreach (var question in entity.Payload.Questions)
        {
            if (string.IsNullOrWhiteSpace(question.Id))
            {
                question.Id = Guid.NewGuid().ToString("N");
            }

            if (string.Equals(question.Type, CampaignQuestionTypes.YesNo, StringComparison.OrdinalIgnoreCase)
                && question.Options.Count == 0)
            {
                question.Options =
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
                ];
            }

            foreach (var option in question.Options)
            {
                if (string.IsNullOrWhiteSpace(option.Id))
                {
                    option.Id = Guid.NewGuid().ToString("N");
                }
            }
        }
    }

    private static LocalizedTextDto ToLocalizedDto(LocalizedText text) => new()
    {
        En = text.En,
        El = text.El
    };

    private static LocalizedText FromLocalizedDto(LocalizedTextDto? dto) => new()
    {
        En = dto?.En?.Trim() ?? string.Empty,
        El = dto?.El?.Trim() ?? string.Empty
    };

    private static CampaignPayloadDto ToPayloadDto(CampaignPayload payload) => new()
    {
        CtaLabelEn = payload.CtaLabelEn,
        CtaLabelEl = payload.CtaLabelEl,
        CtaUrl = payload.CtaUrl,
        ShowResultsAfterVote = payload.ShowResultsAfterVote,
        Questions = payload.Questions.Select(q => new CampaignQuestionDto
        {
            Id = q.Id,
            Type = q.Type,
            Prompt = ToLocalizedDto(q.Prompt),
            Required = q.Required,
            Options = q.Options.Select(o => new CampaignOptionDto
            {
                Id = o.Id,
                Label = ToLocalizedDto(o.Label)
            }).ToList()
        }).ToList()
    };

    private static CampaignPayload FromPayloadDto(CampaignPayloadDto? dto) => new()
    {
        CtaLabelEn = string.IsNullOrWhiteSpace(dto?.CtaLabelEn) ? null : dto!.CtaLabelEn.Trim(),
        CtaLabelEl = string.IsNullOrWhiteSpace(dto?.CtaLabelEl) ? null : dto!.CtaLabelEl.Trim(),
        CtaUrl = string.IsNullOrWhiteSpace(dto?.CtaUrl) ? null : dto!.CtaUrl.Trim(),
        ShowResultsAfterVote = dto?.ShowResultsAfterVote ?? false,
        Questions = (dto?.Questions ?? new List<CampaignQuestionDto>()).Select(q => new CampaignQuestion
        {
            Id = q.Id ?? string.Empty,
            Type = q.Type?.Trim().ToLowerInvariant() ?? CampaignQuestionTypes.YesNo,
            Prompt = FromLocalizedDto(q.Prompt),
            Required = q.Required,
            Options = (q.Options ?? new List<CampaignOptionDto>()).Select(o => new CampaignOption
            {
                Id = o.Id ?? string.Empty,
                Label = FromLocalizedDto(o.Label)
            }).ToList()
        }).ToList()
    };
}

internal static class CampaignValidation
{
    public static void ValidateForSave(InAppCampaign entity)
    {
        if (!CampaignKinds.All.Contains(entity.Kind))
        {
            throw new ValidationException("Invalid campaign kind.");
        }

        if (!CampaignPriorities.All.Contains(entity.Priority))
        {
            throw new ValidationException("Invalid campaign priority.");
        }

        if (string.IsNullOrWhiteSpace(entity.Title.En) && string.IsNullOrWhiteSpace(entity.Title.El))
        {
            throw new ValidationException("Title is required in at least one language.");
        }

        if (entity.EndsAt is { } end && entity.StartsAt is { } start && end < start)
        {
            throw new ValidationException("End date must be after start date.");
        }

        if (string.Equals(entity.Kind, CampaignKinds.Announcement, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (entity.Payload.Questions.Count == 0)
        {
            throw new ValidationException("Add at least one question.");
        }

        if (string.Equals(entity.Kind, CampaignKinds.Poll, StringComparison.OrdinalIgnoreCase)
            && entity.Payload.Questions.Count != 1)
        {
            throw new ValidationException("Polls must have exactly one question.");
        }

        foreach (var question in entity.Payload.Questions)
        {
            if (!CampaignQuestionTypes.All.Contains(question.Type))
            {
                throw new ValidationException($"Invalid question type '{question.Type}'.");
            }

            if (string.IsNullOrWhiteSpace(question.Prompt.En) && string.IsNullOrWhiteSpace(question.Prompt.El))
            {
                throw new ValidationException("Each question needs a prompt.");
            }

            if (!string.Equals(question.Type, CampaignQuestionTypes.ShortText, StringComparison.OrdinalIgnoreCase)
                && question.Options.Count < 2)
            {
                throw new ValidationException("Choice questions need at least two options.");
            }
        }
    }

    public static void ValidateAnswers(InAppCampaign campaign, IReadOnlyList<RespondAnswerDto> answers)
    {
        var byId = answers.ToDictionary(a => a.QuestionId, StringComparer.Ordinal);
        foreach (var question in campaign.Payload.Questions)
        {
            byId.TryGetValue(question.Id, out var answer);
            var hasOptions = answer?.OptionIds?.Count > 0;
            var hasText = !string.IsNullOrWhiteSpace(answer?.TextValue);

            if (question.Required && !hasOptions && !hasText)
            {
                throw new ValidationException($"Question '{question.Id}' is required.");
            }

            if (answer == null)
            {
                continue;
            }

            if (string.Equals(question.Type, CampaignQuestionTypes.ShortText, StringComparison.OrdinalIgnoreCase))
            {
                if (hasOptions)
                {
                    throw new ValidationException("Text questions do not accept options.");
                }

                continue;
            }

            var validIds = question.Options.Select(o => o.Id).ToHashSet(StringComparer.Ordinal);
            foreach (var optionId in answer.OptionIds ?? new List<string>())
            {
                if (!validIds.Contains(optionId))
                {
                    throw new ValidationException($"Unknown option '{optionId}'.");
                }
            }

            if (string.Equals(question.Type, CampaignQuestionTypes.Multi, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if ((answer.OptionIds?.Count ?? 0) > 1)
            {
                throw new ValidationException("Only one option is allowed for this question.");
            }
        }
    }
}
