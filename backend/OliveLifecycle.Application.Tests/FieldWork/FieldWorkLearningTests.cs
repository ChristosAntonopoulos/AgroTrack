using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class FieldWorkLearningTests
{
    [Theory]
    [InlineData(0, false)]
    [InlineData(1, false)]
    [InlineData(2, false)]
    [InlineData(3, true)]
    [InlineData(5, true)]
    public void DismissalThreshold_TriggersPromptState(int count, bool expected)
    {
        Assert.Equal(expected, FieldWorkLearning.ShouldPromptDismissalLearning(count));
        Assert.Equal(3, FieldWorkLearning.DismissalPromptThreshold);
    }

    [Fact]
    public void DontPropose_SetsDisabled()
    {
        var next = FieldWorkLearning.ResolveDismissalPreference(
            DismissalLearningChoice.DontPropose,
            PreferenceMode.Enabled);

        Assert.Equal(PreferenceMode.Disabled, next);
    }

    [Fact]
    public void AskWhenIndicated_SetsAskFirst()
    {
        var next = FieldWorkLearning.ResolveDismissalPreference(
            DismissalLearningChoice.AskWhenIndicated,
            PreferenceMode.Enabled);

        Assert.Equal(PreferenceMode.AskFirst, next);
    }

    [Fact]
    public void KeepProposing_RestoresEnabledFromDisabled()
    {
        var next = FieldWorkLearning.ResolveDismissalPreference(
            DismissalLearningChoice.KeepProposing,
            PreferenceMode.Disabled);

        Assert.Equal(PreferenceMode.Enabled, next);
    }

    [Fact]
    public void OfficialWarning_StillEnabled_WhenPracticeDisabled()
    {
        // Applying "don't propose" must not suppress official/safety path.
        var profile = new FieldWorkProfile
        {
            Status = FieldWorkProfileStatus.Active,
            PestManagement = new PestManagementProfile
            {
                PreferenceMode = PreferenceMode.Disabled,
                DecisionApproach = PestDecisionApproach.NoUsualTreatments
            }
        };

        var treatment = new FieldWorkCatalogueEntry
        {
            Code = "TX_TREAT",
            GreekName = "Επέμβαση",
            EnglishName = "Treatment",
            Category = "Plant protection",
            IsPlantProtectionTreatment = true,
            Rules = []
        };

        var result = FieldWorkProfileEligibility.EvaluateTemplateForField(new TemplateEligibilityContext
        {
            Entry = treatment,
            FieldId = "field-1",
            Profile = profile,
            ResultYear = 2026,
            UtcNow = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc),
            CandidateSourceType = ProposalSourceType.OfficialWarning,
            TreatAsOfficialOrSafetyInformation = true,
            ActiveWarnings =
            [
                new OfficialAgriculturalWarning
                {
                    Id = "w1",
                    Title = "Safety",
                    TemplateCodes = ["TX_TREAT"],
                    FieldIds = ["field-1"],
                    IsActive = true
                }
            ]
        });

        Assert.Equal(TemplateEligibilityStatus.Enabled, result.Status);
        Assert.True(result.IsSafetyOrOfficialOverride);
    }

    [Theory]
    [InlineData("T06", "completed", true)]
    [InlineData("T06", "partially_completed", true)]
    [InlineData("T06", "not_done", false)]
    [InlineData("T14", "completed", false)]
    public void CompletionPrompt_OnlyForPruningSuccess(string code, string outcome, bool expected)
    {
        Assert.Equal(expected, FieldWorkLearning.ShouldPromptCompletionFrequency(code, outcome));
    }

    [Fact]
    public void Completion_NoChange_DoesNotProduceApplication()
    {
        Assert.Null(FieldWorkLearning.ResolveCompletionFrequency(CompletionFrequencyChoice.NoChange, 2026));
    }

    [Fact]
    public void Completion_EveryTwoYears_UpdatesLastYearAndFrequency()
    {
        var app = FieldWorkLearning.ResolveCompletionFrequency(CompletionFrequencyChoice.EveryTwoYears, 2026);

        Assert.NotNull(app);
        Assert.Equal(2026, app!.LastPerformedYear);
        Assert.Equal(FrequencyType.EveryNYears, app.FrequencyType);
        Assert.Equal(2, app.FrequencyValue);
    }

    [Fact]
    public void AnnualReview_DueAfterYear()
    {
        var now = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc);
        Assert.True(FieldWorkLearning.IsAnnualReviewDue(null, now));
        Assert.False(FieldWorkLearning.IsAnnualReviewDue(now.AddDays(-30), now));
        Assert.True(FieldWorkLearning.IsAnnualReviewDue(now.AddDays(-400), now));
    }

    [Fact]
    public void IncrementalQuestions_EmptyUntilVersionBumpRegistered()
    {
        Assert.Empty(FieldWorkLearning.IncrementalQuestionIdsForVersion(1, 1));
        Assert.Empty(FieldWorkLearning.IncrementalQuestionIdsForVersion(1, FieldWorkProfile.CurrentOnboardingVersion));
    }

    [Fact]
    public void SuggestDefaultAssignee_FromPracticeThenAssignments()
    {
        var profile = new FieldWorkProfile
        {
            Status = FieldWorkProfileStatus.Active,
            Pruning = new PruningProfile { DefaultAssigneeId = "user-a" },
            DefaultAssignments = new DefaultAssignments
            {
                Entries = [new DefaultAssignmentEntry { Category = "pruning", AssigneeUserId = "user-b" }]
            }
        };

        Assert.Equal("user-a", FieldWorkLearning.SuggestDefaultAssigneeId(profile, "T06"));

        profile.Pruning.DefaultAssigneeId = null;
        Assert.Equal("user-b", FieldWorkLearning.SuggestDefaultAssigneeId(profile, "T06"));
    }
}
