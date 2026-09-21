using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Campaigns;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class InAppCampaignServiceTests
{
    private readonly Mock<IInAppCampaignRepository> _campaigns = new();
    private readonly Mock<ICampaignEngagementRepository> _engagements = new();
    private readonly Mock<ICampaignAnswerRepository> _answers = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly DateTime _now = new(2026, 9, 14, 12, 0, 0, DateTimeKind.Utc);
    private readonly AdminCampaignService _admin;
    private readonly InAppMessageService _messages;

    public InAppCampaignServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(_now);
        _admin = new AdminCampaignService(
            _campaigns.Object,
            _engagements.Object,
            _answers.Object,
            _clock.Object);
        _messages = new InAppMessageService(
            _campaigns.Object,
            _engagements.Object,
            _answers.Object,
            _notifications.Object,
            _clock.Object);
    }

    [Fact]
    public async Task Publish_RequiresPlacement()
    {
        _campaigns.Setup(r => r.GetByIdAsync("c1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleCampaign(placementsInbox: false, placementsModal: false));

        await Assert.ThrowsAsync<ValidationException>(() => _admin.PublishAsync("c1"));
    }

    [Fact]
    public async Task GetInbox_MergesTransactionalAndCampaigns_ForMatchingRole()
    {
        _notifications.Setup(r => r.GetByUserIdAsync("u1", 50, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new UserNotification
                {
                    Id = "n1",
                    UserId = "u1",
                    Type = "partner_contact",
                    Title = "Request",
                    Message = "New request",
                    IsRead = false,
                    CreatedAt = _now.AddMinutes(-5)
                }
            ]);
        _campaigns.Setup(r => r.GetPublishedActiveAsync(_now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                SampleCampaign(id: "camp-owner", roles: [Roles.FieldOwner]),
                SampleCampaign(id: "camp-agronomist", roles: [Roles.Agronomist], titleEl: "Only agronomists")
            ]);
        _engagements.Setup(r => r.GetByUserAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<CampaignEngagement>());

        var inbox = await _messages.GetInboxAsync("u1", Roles.FieldOwner, "el");

        Assert.Contains(inbox, i => i.Id == "n1" && i.Source == "transactional");
        Assert.Contains(inbox, i => i.CampaignId == "camp-owner" && i.Source == "campaign");
        Assert.DoesNotContain(inbox, i => i.CampaignId == "camp-agronomist");
    }

    [Fact]
    public async Task PendingModals_SkipDismissedAndCompleted()
    {
        var campaign = SampleCampaign(id: "modal-1", placementsModal: true, placementsInbox: true);
        _campaigns.Setup(r => r.GetPublishedActiveAsync(_now, It.IsAny<CancellationToken>()))
            .ReturnsAsync([campaign]);
        _engagements.Setup(r => r.GetByUserAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new CampaignEngagement
                {
                    UserId = "u1",
                    CampaignId = "modal-1",
                    Status = CampaignEngagementStatuses.Dismissed
                }
            ]);

        var pending = await _messages.GetPendingModalsAsync("u1", Roles.FieldOwner, "el");
        Assert.Empty(pending);
    }

    [Fact]
    public async Task Respond_RejectsSecondVote()
    {
        var campaign = SampleCampaign(id: "q1", kind: CampaignKinds.Questionnaire);
        _campaigns.Setup(r => r.GetByIdAsync("q1", It.IsAny<CancellationToken>())).ReturnsAsync(campaign);
        _engagements.Setup(r => r.GetAsync("u1", "q1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CampaignEngagement
            {
                UserId = "u1",
                CampaignId = "q1",
                Status = CampaignEngagementStatuses.Completed
            });

        await Assert.ThrowsAsync<ValidationException>(() =>
            _messages.RespondAsync(
                "q1",
                "u1",
                Roles.FieldOwner,
                "Maria",
                "el",
                new RespondInAppMessageDto
                {
                    Answers =
                    [
                        new RespondAnswerDto { QuestionId = "dacus-seen", OptionIds = ["yes"] }
                    ]
                }));
    }

    [Fact]
    public async Task Respond_RejectsUnknownOption()
    {
        var campaign = SampleCampaign(id: "q1", kind: CampaignKinds.Questionnaire);
        _campaigns.Setup(r => r.GetByIdAsync("q1", It.IsAny<CancellationToken>())).ReturnsAsync(campaign);
        _engagements.Setup(r => r.GetAsync("u1", "q1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((CampaignEngagement?)null);

        await Assert.ThrowsAsync<ValidationException>(() =>
            _messages.RespondAsync(
                "q1",
                "u1",
                Roles.FieldOwner,
                "Maria",
                "el",
                new RespondInAppMessageDto
                {
                    Answers =
                    [
                        new RespondAnswerDto { QuestionId = "dacus-seen", OptionIds = ["maybe"] }
                    ]
                }));
    }

    [Fact]
    public async Task Respond_CompletesEngagement_AndStoresAnswer()
    {
        var campaign = SampleCampaign(id: "q1", kind: CampaignKinds.Questionnaire);
        _campaigns.Setup(r => r.GetByIdAsync("q1", It.IsAny<CancellationToken>())).ReturnsAsync(campaign);
        _engagements.Setup(r => r.GetAsync("u1", "q1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((CampaignEngagement?)null);
        _answers.Setup(r => r.GetByUserAndCampaignAsync("u1", "q1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<CampaignAnswer>());

        CampaignEngagement? saved = null;
        _engagements.Setup(r => r.UpsertAsync(It.IsAny<CampaignEngagement>(), It.IsAny<CancellationToken>()))
            .Callback<CampaignEngagement, CancellationToken>((e, _) => saved = e)
            .Returns(Task.CompletedTask);

        var result = await _messages.RespondAsync(
            "q1",
            "u1",
            Roles.FieldOwner,
            "Maria",
            "el",
            new RespondInAppMessageDto
            {
                Answers =
                [
                    new RespondAnswerDto { QuestionId = "dacus-seen", OptionIds = ["yes"] }
                ]
            });

        Assert.True(result.HasResponded);
        Assert.NotNull(saved);
        Assert.Equal(CampaignEngagementStatuses.Completed, saved!.Status);
        _answers.Verify(r => r.UpsertAsync(It.Is<CampaignAnswer>(a =>
            a.QuestionId == "dacus-seen" && a.OptionIds.Contains("yes")), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Dismiss_ForbiddenWhenNotDismissible()
    {
        var campaign = SampleCampaign(id: "q1", modalDismissible: false);
        _campaigns.Setup(r => r.GetByIdAsync("q1", It.IsAny<CancellationToken>())).ReturnsAsync(campaign);

        await Assert.ThrowsAsync<ValidationException>(() =>
            _messages.DismissAsync("q1", "u1", Roles.FieldOwner));
    }

    [Fact]
    public async Task GetMessage_ForbiddenForWrongRole()
    {
        var campaign = SampleCampaign(id: "q1", roles: [Roles.Agronomist]);
        _campaigns.Setup(r => r.GetByIdAsync("q1", It.IsAny<CancellationToken>())).ReturnsAsync(campaign);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _messages.GetMessageAsync("q1", "u1", Roles.Producer, "el"));
    }

    private InAppCampaign SampleCampaign(
        string id = "c1",
        string kind = CampaignKinds.Questionnaire,
        bool placementsInbox = true,
        bool placementsModal = false,
        bool modalDismissible = true,
        IEnumerable<string>? roles = null,
        string titleEl = "Έχετε δει δάκο;") => new()
    {
        Id = id,
        Kind = kind,
        Status = CampaignStatuses.Published,
        Title = new LocalizedText { En = "Have you seen olive fruit fly?", El = titleEl },
        Body = new LocalizedText { En = "Help us track sightings.", El = "Βοηθήστε μας." },
        Placements = new CampaignPlacements { Inbox = placementsInbox, Modal = placementsModal },
        Priority = CampaignPriorities.High,
        Audience = new CampaignAudience { Roles = roles?.ToList() ?? [Roles.FieldOwner, Roles.Producer] },
        ModalDismissible = modalDismissible,
        PublishedAt = _now.AddHours(-1),
        CreatedAt = _now.AddHours(-2),
        Payload = new CampaignPayload
        {
            Questions =
            [
                new CampaignQuestion
                {
                    Id = "dacus-seen",
                    Type = CampaignQuestionTypes.YesNo,
                    Required = true,
                    Prompt = new LocalizedText { En = "Seen?", El = "Είδατε;" },
                    Options =
                    [
                        new CampaignOption { Id = "yes", Label = new LocalizedText { En = "Yes", El = "Ναι" } },
                        new CampaignOption { Id = "no", Label = new LocalizedText { En = "No", El = "Όχι" } }
                    ]
                }
            ]
        }
    };
}

public class AdminFeedbackServiceTests
{
    private readonly Mock<IUserFeedbackRepository> _feedback = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly AdminFeedbackService _service;
    private readonly DateTime _now = new(2026, 9, 14, 12, 0, 0, DateTimeKind.Utc);

    public AdminFeedbackServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(_now);
        _service = new AdminFeedbackService(_feedback.Object, _clock.Object);
    }

    [Fact]
    public async Task MarkSeen_SetsTimestampOnce()
    {
        var entity = new UserFeedback
        {
            Id = "fb-1",
            UserId = "u1",
            Comment = "Hello",
            SeenAt = null
        };
        _feedback.Setup(r => r.GetByIdAsync("fb-1", It.IsAny<CancellationToken>())).ReturnsAsync(entity);
        _feedback.Setup(r => r.UpdateAsync(It.IsAny<UserFeedback>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserFeedback e, CancellationToken _) => e);

        await _service.MarkSeenAsync("fb-1");

        Assert.Equal(_now, entity.SeenAt);
        _feedback.Verify(r => r.UpdateAsync(It.IsAny<UserFeedback>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task List_ReturnsExcerptAndUnseenCount()
    {
        _feedback.Setup(r => r.GetNewestPageAsync(1, 30, It.IsAny<CancellationToken>()))
            .ReturnsAsync((
                new List<UserFeedback>
                {
                    new()
                    {
                        Id = "fb-1",
                        UserId = "u1",
                        UserName = "Maria",
                        Role = "FieldOwner",
                        Comment = new string('x', 200),
                        CreatedAt = _now
                    }
                },
                1));
        _feedback.Setup(r => r.CountUnseenAsync(It.IsAny<CancellationToken>())).ReturnsAsync(3);

        var page = await _service.ListAsync(1, 30);

        Assert.Equal(3, page.UnseenCount);
        Assert.Single(page.Items);
        Assert.True(page.Items[0].CommentExcerpt.Length <= 160);
    }
}
