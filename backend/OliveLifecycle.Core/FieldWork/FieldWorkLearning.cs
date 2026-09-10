using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.FieldWork;

/// <summary>
/// Pure ongoing-learning rules for FieldWorkProfile.
/// Never persists — callers must apply only after an explicit user action.
/// Official/safety proposal eligibility is unaffected by PreferenceMode.Disabled
/// (see <see cref="FieldWorkProfileEligibility"/>).
/// </summary>
public static class FieldWorkLearning
{
    /// <summary>Repeated dismissals of the same template for a field before prompting.</summary>
    public const int DismissalPromptThreshold = 3;

    /// <summary>Soft annual review cadence after last review / activate.</summary>
    public const int AnnualReviewDays = 365;

    /// <summary>
    /// When <see cref="FieldWorkProfile.CurrentOnboardingVersion"/> increases,
    /// ask only new questions — do not restart full onboarding.
    /// Bump <see cref="FieldWorkProfile.CurrentOnboardingVersion"/> and register
    /// the new question ids here; clients call mark-reviewed / answer endpoints.
    /// </summary>
    public static IReadOnlyList<string> IncrementalQuestionIdsForVersion(int fromVersion, int toVersion)
    {
        if (toVersion <= fromVersion)
        {
            return [];
        }

        // Version 1 → future bumps: register new question ids per version delta.
        // Currently no incremental questions beyond the initial onboarding set.
        return [];
    }

    public static bool ShouldPromptDismissalLearning(int dismissCountForTemplate) =>
        dismissCountForTemplate >= DismissalPromptThreshold;

    public static bool IsAnnualReviewDue(DateTime? lastReviewedAtUtc, DateTime utcNow)
    {
        if (lastReviewedAtUtc is null)
        {
            return true;
        }

        return (utcNow - lastReviewedAtUtc.Value).TotalDays >= AnnualReviewDays;
    }

    /// <summary>Completion-frequency prompt for pruning (T06) after a successful execution.</summary>
    public static bool ShouldPromptCompletionFrequency(string? templateCode, string? outcomeApi)
    {
        if (!string.Equals(templateCode, "T06", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var outcome = (outcomeApi ?? string.Empty).Trim().ToLowerInvariant();
        return outcome is "completed" or "partially_completed";
    }

    public static string PracticeKeyFromTemplate(string templateCode) =>
        FieldWorkProfileEligibility.ResolvePracticeCategory(templateCode) switch
        {
            PracticeCategory.Pruning or PracticeCategory.PruningResidue => "pruning",
            PracticeCategory.Irrigation => "irrigation",
            PracticeCategory.FertilisationPlan or PracticeCategory.FertilisationApplication => "fertilisation",
            PracticeCategory.GroundCover => "ground_cover",
            PracticeCategory.PestMonitoring or PracticeCategory.PestTreatment => "pest",
            PracticeCategory.SoilAnalysis or PracticeCategory.LeafAnalysis => "analysis",
            PracticeCategory.HarvestPrep or PracticeCategory.PreHarvestReadiness => "harvest",
            _ => "other"
        };

    /// <summary>
    /// Maps assignment categories (Question 9) used by DefaultAssignments.
    /// </summary>
    public static string AssignmentCategoryFromTemplate(string templateCode) =>
        PracticeKeyFromTemplate(templateCode) switch
        {
            "pest" => "monitoring",
            "analysis" => "monitoring",
            var key when key != "other" => key,
            _ => "monitoring"
        };

    public static PreferenceMode? ResolveDismissalPreference(
        DismissalLearningChoice choice,
        PreferenceMode current)
    {
        return choice switch
        {
            DismissalLearningChoice.DontPropose => PreferenceMode.Disabled,
            DismissalLearningChoice.AskWhenIndicated => PreferenceMode.AskFirst,
            DismissalLearningChoice.KeepProposing =>
                current is PreferenceMode.Unknown or PreferenceMode.Disabled
                    ? PreferenceMode.Enabled
                    : current,
            _ => null
        };
    }

    /// <summary>
    /// Applies an explicit completion-frequency choice. Returns null when the user chose no change
    /// (silent profile writes are forbidden).
    /// </summary>
    public static CompletionFrequencyApplication? ResolveCompletionFrequency(
        CompletionFrequencyChoice choice,
        int resultYear)
    {
        return choice switch
        {
            CompletionFrequencyChoice.EveryTwoYears => new CompletionFrequencyApplication(
                resultYear,
                FrequencyType.EveryNYears,
                FrequencyValue: 2),
            CompletionFrequencyChoice.EveryYear => new CompletionFrequencyApplication(
                resultYear,
                FrequencyType.TimesPerYear,
                FrequencyValue: 1),
            CompletionFrequencyChoice.WhenNeeded => new CompletionFrequencyApplication(
                resultYear,
                FrequencyType.WhenNeeded,
                FrequencyValue: null),
            CompletionFrequencyChoice.NoChange => null,
            _ => null
        };
    }

    public static PracticeProfileBase? GetPractice(FieldWorkProfile profile, string practiceKey) =>
        practiceKey.Trim().ToLowerInvariant() switch
        {
            "pruning" => profile.Pruning,
            "irrigation" => profile.Irrigation,
            "fertilisation" => profile.Fertilisation,
            "ground_cover" => profile.GroundCover,
            "pest" => profile.PestManagement,
            "analysis" => profile.Analysis,
            "harvest" => profile.Harvest,
            _ => null
        };

    /// <summary>
    /// Suggested assignee only — never grants access or sends notifications.
    /// Prefers practice DefaultAssigneeId, then DefaultAssignments entry.
    /// </summary>
    public static string? SuggestDefaultAssigneeId(
        FieldWorkProfile? profile,
        string templateCode,
        string? actingUserId = null)
    {
        if (profile is null || profile.Status != FieldWorkProfileStatus.Active)
        {
            return null;
        }

        var practice = GetPractice(profile, PracticeKeyFromTemplate(templateCode));
        if (!string.IsNullOrWhiteSpace(practice?.DefaultAssigneeId))
        {
            return practice.DefaultAssigneeId;
        }

        var category = AssignmentCategoryFromTemplate(templateCode);
        var entry = profile.DefaultAssignments.Entries
            .FirstOrDefault(e => string.Equals(e.Category, category, StringComparison.OrdinalIgnoreCase));

        if (entry is null)
        {
            return null;
        }

        if (entry.IsSelf)
        {
            return string.IsNullOrWhiteSpace(actingUserId) ? null : actingUserId;
        }

        return string.IsNullOrWhiteSpace(entry.AssigneeUserId) ? null : entry.AssigneeUserId;
    }
}

public enum DismissalLearningChoice
{
    DontPropose,
    AskWhenIndicated,
    KeepProposing
}

public static class DismissalLearningChoiceExtensions
{
    public static string ToApiString(this DismissalLearningChoice choice) => choice switch
    {
        DismissalLearningChoice.DontPropose => "dont_propose",
        DismissalLearningChoice.AskWhenIndicated => "ask_when_indicated",
        DismissalLearningChoice.KeepProposing => "keep_proposing",
        _ => "keep_proposing"
    };

    public static DismissalLearningChoice? FromApiString(string? value) =>
        value?.Trim().ToLowerInvariant() switch
        {
            "dont_propose" or "disabled" => DismissalLearningChoice.DontPropose,
            "ask_when_indicated" or "ask_first" => DismissalLearningChoice.AskWhenIndicated,
            "keep_proposing" or "enabled" => DismissalLearningChoice.KeepProposing,
            _ => null
        };
}

public enum CompletionFrequencyChoice
{
    EveryTwoYears,
    EveryYear,
    WhenNeeded,
    NoChange
}

public static class CompletionFrequencyChoiceExtensions
{
    public static string ToApiString(this CompletionFrequencyChoice choice) => choice switch
    {
        CompletionFrequencyChoice.EveryTwoYears => "every_2_years",
        CompletionFrequencyChoice.EveryYear => "every_year",
        CompletionFrequencyChoice.WhenNeeded => "when_needed",
        CompletionFrequencyChoice.NoChange => "no_change",
        _ => "no_change"
    };

    public static CompletionFrequencyChoice? FromApiString(string? value) =>
        value?.Trim().ToLowerInvariant() switch
        {
            "every_2_years" or "every_two_years" => CompletionFrequencyChoice.EveryTwoYears,
            "every_year" => CompletionFrequencyChoice.EveryYear,
            "when_needed" => CompletionFrequencyChoice.WhenNeeded,
            "no_change" => CompletionFrequencyChoice.NoChange,
            _ => null
        };
}

public sealed record CompletionFrequencyApplication(
    int LastPerformedYear,
    FrequencyType FrequencyType,
    int? FrequencyValue);
