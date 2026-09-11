using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class FieldWorkPlanPreviewServiceTests
{
    private readonly Mock<IFieldWorkProfileRepository> _profiles = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldTaskRepository> _fieldTasks = new();
    private readonly Mock<ITaskExecutionRepository> _executions = new();
    private readonly Mock<IFieldWorkAuthorizationService> _auth = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly FieldWorkPlanPreviewService _service;

    public FieldWorkPlanPreviewServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 3, 18, 10, 0, 0, DateTimeKind.Utc));
        _fieldTasks.Setup(r => r.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _executions.Setup(r => r.GetByFieldAndYearAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _fields.Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", Status = FieldStatus.Active, OwnerId = "owner-1" });

        _service = new FieldWorkPlanPreviewService(
            _profiles.Object,
            _fields.Object,
            _fieldTasks.Object,
            _executions.Object,
            _auth.Object,
            _clock.Object);
    }

    [Fact]
    public async Task DraftProfile_IsTreatedAsActiveForPreview_WithoutPersisting()
    {
        var profile = new FieldWorkProfile
        {
            Id = "profile-1",
            FieldId = "field-1",
            Status = FieldWorkProfileStatus.Draft,
            ResultYearCreated = 2026,
            Irrigation = new IrrigationProfile
            {
                PreferenceMode = PreferenceMode.Disabled
            },
            Pruning = new PruningProfile
            {
                PreferenceMode = PreferenceMode.Disabled
            }
        };

        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);

        var preview = await _service.GetAsync("field-1", 2026, "owner-1", "Owner", "el");

        Assert.True(preview.UsedDraftAsPreview);
        Assert.Equal("draft", preview.ProfileStatus);
        Assert.Equal(FieldWorkProfileStatus.Draft, profile.Status); // not mutated permanently
        Assert.Equal(2026, preview.ResultYear);
        Assert.Equal(
            FieldWorkCatalogue.All.Count,
            preview.EnabledCount + preview.AskFirstCount + preview.SuppressedCount);

        // Rain-fed draft should suppress recurring irrigation (T15) when treated as active.
        Assert.Contains(preview.Suppressed, i => i.TemplateCode == "T15");
        Assert.DoesNotContain(preview.Enabled, i => i.TemplateCode == "T15");
    }

    [Fact]
    public async Task GroupsEnabledAskFirstAndSuppressed_WithHumanReasons()
    {
        var profile = new FieldWorkProfile
        {
            Id = "profile-1",
            FieldId = "field-1",
            Status = FieldWorkProfileStatus.Draft,
            ResultYearCreated = 2026,
            Irrigation = new IrrigationProfile
            {
                PreferenceMode = PreferenceMode.AskFirst
            },
            Pruning = new PruningProfile
            {
                PreferenceMode = PreferenceMode.Enabled,
                FrequencyType = FrequencyType.EveryNYears,
                FrequencyValue = 2,
                LastPerformedYear = 2025
            },
            Fertilisation = new FertilisationProfile
            {
                PreferenceMode = PreferenceMode.Disabled
            }
        };

        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(profile);

        var preview = await _service.GetAsync("field-1", null, "owner-1", "Owner", "el");

        Assert.Contains(preview.AskFirst, i => i.TemplateCode is "T08" or "T15");
        Assert.Contains(preview.Suppressed, i => i.TemplateCode == "T06");
        Assert.All(preview.Suppressed.Concat(preview.AskFirst).Concat(preview.Enabled), item =>
        {
            Assert.False(string.IsNullOrWhiteSpace(item.TemplateName));
            Assert.False(string.IsNullOrWhiteSpace(item.Reason));
            Assert.DoesNotContain("FrequencyType", item.Reason, StringComparison.Ordinal);
            Assert.DoesNotContain("PreferenceMode", item.Reason, StringComparison.Ordinal);
        });

        var review = preview.Enabled.Concat(preview.AskFirst).Concat(preview.Suppressed)
            .First(i => i.TemplateCode == "T01");
        Assert.Equal(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), review.WindowStart);
        Assert.Equal(new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc).AddTicks(-1), review.WindowEnd);
    }

    [Fact]
    public void MapPracticeCategory_MapsJumpBackKeys()
    {
        Assert.Equal("pruning", FieldWorkPlanPreviewService.MapPracticeCategory(PracticeCategory.PruningResidue));
        Assert.Equal("fertilisation", FieldWorkPlanPreviewService.MapPracticeCategory(PracticeCategory.FertilisationPlan));
        Assert.Equal("ground_cover", FieldWorkPlanPreviewService.MapPracticeCategory(PracticeCategory.GroundCover));
        Assert.Equal("pest", FieldWorkPlanPreviewService.MapPracticeCategory(PracticeCategory.PestMonitoring));
        Assert.Equal("analysis", FieldWorkPlanPreviewService.MapPracticeCategory(PracticeCategory.SoilAnalysis));
        Assert.Equal("harvest", FieldWorkPlanPreviewService.MapPracticeCategory(PracticeCategory.HarvestPrep));
        Assert.Equal("other", FieldWorkPlanPreviewService.MapPracticeCategory(PracticeCategory.Other));
    }

    [Fact]
    public async Task DoesNotCreateFieldTasks_OrCallTaskRepositoriesForWrites()
    {
        _profiles.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldWorkProfile
            {
                Id = "p1",
                FieldId = "field-1",
                Status = FieldWorkProfileStatus.Active,
                ResultYearCreated = 2026
            });

        await _service.GetAsync("field-1", 2026, "owner-1", "Owner", "en");

        _fieldTasks.Verify(
            r => r.CreateAsync(It.IsAny<FieldTask>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _profiles.Verify(
            r => r.UpdateAsync(It.IsAny<FieldWorkProfile>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
