using Microsoft.Extensions.Logging;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class FieldWorkLearningServiceTests
{
    private readonly Mock<IFieldWorkProfileRepository> _profiles = new();
    private readonly Mock<ITaskProposalRepository> _proposals = new();
    private readonly Mock<IFieldWorkAuthorizationService> _auth = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly FieldWorkLearningService _service;

    public FieldWorkLearningServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc));
        _service = new FieldWorkLearningService(
            _profiles.Object,
            _proposals.Object,
            _auth.Object,
            _clock.Object,
            Mock.Of<ILogger<FieldWorkLearningService>>());
    }

    [Fact]
    public async Task EvaluateDismissal_PromptsAtThreshold()
    {
        _proposals.Setup(r => r.QueryAsync(It.IsAny<TaskProposalQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Enumerable.Range(0, 3).Select(i => new TaskProposal
            {
                Id = $"p-{i}",
                FieldId = "field-1",
                TemplateCode = "T09",
                Status = TaskProposalStatus.DismissedForYear
            }).ToList());

        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(ActiveProfile());

        var result = await _service.EvaluateDismissalAsync(
            "field-1",
            new DismissalLearningEvaluateDto { TemplateCode = "T09" },
            "owner-1",
            Roles.FieldOwner);

        Assert.True(result.ShouldPrompt);
        Assert.Equal(3, result.DismissCount);
        Assert.Equal("ground_cover", result.PracticeCategory);
    }

    [Fact]
    public async Task ApplyDismissal_DontPropose_SetsDisabledWithAudit()
    {
        FieldWorkProfile? saved = null;
        var profile = ActiveProfile();
        profile.GroundCover.PreferenceMode = PreferenceMode.Enabled;

        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);
        _profiles.Setup(r => r.UpdateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile p, CancellationToken _) =>
            {
                saved = p;
                return p;
            });

        var dto = await _service.ApplyDismissalAsync(
            "field-1",
            new DismissalLearningApplyDto { TemplateCode = "T09", Choice = "dont_propose" },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("disabled", dto.GroundCover.PreferenceMode);
        Assert.NotNull(saved);
        Assert.Equal(PreferenceMode.Disabled, saved!.GroundCover.PreferenceMode);
        Assert.Equal(PreferenceSource.LearnedFromBehaviour, saved.GroundCover.Source);
        Assert.Equal("owner-1", saved.UpdatedByUserId);
        Assert.NotNull(saved.GroundCover.ConfirmedAt);
    }

    [Fact]
    public async Task ApplyCompletion_NoChange_DoesNotWriteProfile()
    {
        var profile = ActiveProfile();
        profile.Pruning.LastPerformedYear = 2020;
        profile.Pruning.FrequencyType = FrequencyType.Unknown;
        var versionBefore = profile.ProfileVersion;

        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);

        await _service.ApplyCompletionAsync(
            "field-1",
            new CompletionLearningApplyDto
            {
                TemplateCode = "T06",
                ResultYear = 2026,
                Choice = "no_change"
            },
            "owner-1",
            Roles.FieldOwner);

        _profiles.Verify(
            r => r.UpdateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()),
            Times.Never);
        Assert.Equal(2020, profile.Pruning.LastPerformedYear);
        Assert.Equal(versionBefore, profile.ProfileVersion);
    }

    [Fact]
    public async Task ApplyCompletion_EveryTwoYears_UpdatesOnConfirmOnly()
    {
        FieldWorkProfile? saved = null;
        var profile = ActiveProfile();

        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);
        _profiles.Setup(r => r.UpdateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile p, CancellationToken _) =>
            {
                saved = p;
                return p;
            });

        var dto = await _service.ApplyCompletionAsync(
            "field-1",
            new CompletionLearningApplyDto
            {
                TemplateCode = "T06",
                ResultYear = 2026,
                Choice = "every_2_years"
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal(2026, dto.Pruning.LastPerformedYear);
        Assert.Equal("every_n_years", dto.Pruning.FrequencyType);
        Assert.Equal(2, dto.Pruning.FrequencyValue);
        Assert.Equal(PreferenceSource.LearnedFromBehaviour, saved!.Pruning.Source);
        Assert.Equal("owner-1", saved.UpdatedByUserId);
        Assert.NotNull(saved.Pruning.ConfirmedAt);
    }

    [Fact]
    public async Task MarkReviewed_SetsLastReviewedAt()
    {
        FieldWorkProfile? saved = null;
        var profile = ActiveProfile();
        profile.LastReviewedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);
        _profiles.Setup(r => r.UpdateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldWorkProfile p, CancellationToken _) =>
            {
                saved = p;
                return p;
            });

        var dto = await _service.MarkReviewedAsync("field-1", null, "owner-1", Roles.FieldOwner);

        Assert.NotNull(dto.LastReviewedAt);
        Assert.Equal(_clock.Object.UtcNow, saved!.LastReviewedAt);
        Assert.Equal("owner-1", saved.UpdatedByUserId);
    }

    [Fact]
    public async Task GetStatus_ReportsAnnualReviewDue()
    {
        var profile = ActiveProfile();
        profile.LastReviewedAt = _clock.Object.UtcNow.AddDays(-400);
        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);

        var status = await _service.GetStatusAsync("field-1", "owner-1", Roles.FieldOwner);

        Assert.True(status.AnnualReviewDue);
        Assert.False(status.HasIncrementalQuestions);
    }

    private static FieldWorkProfile ActiveProfile() => new()
    {
        Id = "profile-1",
        FieldId = "field-1",
        Status = FieldWorkProfileStatus.Active,
        ProfileVersion = 1,
        OnboardingVersion = FieldWorkProfile.CurrentOnboardingVersion,
        CreatedByUserId = "owner-1",
        Pruning = new PruningProfile { PreferenceMode = PreferenceMode.Enabled },
        GroundCover = new GroundCoverProfile { PreferenceMode = PreferenceMode.Enabled },
        PestManagement = new PestManagementProfile { PreferenceMode = PreferenceMode.Enabled }
    };
}
