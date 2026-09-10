using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.FieldWork;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Application.Services;

public interface IFieldWorkLearningService
{
    Task<DismissalLearningEvaluateResultDto> EvaluateDismissalAsync(
        string fieldId,
        DismissalLearningEvaluateDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldWorkProfileDto> ApplyDismissalAsync(
        string fieldId,
        DismissalLearningApplyDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<CompletionLearningEvaluateResultDto> EvaluateCompletionAsync(
        string fieldId,
        CompletionLearningEvaluateDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldWorkProfileDto> ApplyCompletionAsync(
        string fieldId,
        CompletionLearningApplyDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldWorkProfileDto> MarkReviewedAsync(
        string fieldId,
        MarkProfileReviewedDto? dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldWorkLearningStatusDto> GetStatusAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Ongoing learning after onboarding. Preferences change only on explicit apply actions.
/// </summary>
public class FieldWorkLearningService : IFieldWorkLearningService
{
    private readonly IFieldWorkProfileRepository _profiles;
    private readonly ITaskProposalRepository _proposals;
    private readonly IFieldWorkAuthorizationService _auth;
    private readonly IDateTimeProvider _clock;
    private readonly ILogger<FieldWorkLearningService> _logger;

    public FieldWorkLearningService(
        IFieldWorkProfileRepository profiles,
        ITaskProposalRepository proposals,
        IFieldWorkAuthorizationService auth,
        IDateTimeProvider clock,
        ILogger<FieldWorkLearningService> logger)
    {
        _profiles = profiles;
        _proposals = proposals;
        _auth = auth;
        _clock = clock;
        _logger = logger;
    }

    public async Task<DismissalLearningEvaluateResultDto> EvaluateDismissalAsync(
        string fieldId,
        DismissalLearningEvaluateDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);

        var templateCode = RequireTemplate(dto.TemplateCode);
        var dismissCount = await CountDismissalsAsync(fieldId, templateCode, cancellationToken);
        var shouldPrompt = FieldWorkLearning.ShouldPromptDismissalLearning(dismissCount);
        var practiceKey = FieldWorkLearning.PracticeKeyFromTemplate(templateCode);

        var profile = await _profiles.GetByFieldIdAsync(fieldId, cancellationToken);
        var practice = profile is null ? null : FieldWorkLearning.GetPractice(profile, practiceKey);
        var mode = practice?.PreferenceMode ?? PreferenceMode.Unknown;

        FieldWorkProductEvents.Emit(
            _logger,
            FieldWorkProductEvents.ProposalDismissed,
            fieldId,
            userId,
            templateCode,
            practiceKey,
            $"count={dismissCount};shouldPrompt={shouldPrompt}");

        var greek = !language.StartsWith("en", StringComparison.OrdinalIgnoreCase);
        return new DismissalLearningEvaluateResultDto
        {
            ShouldPrompt = shouldPrompt,
            DismissCount = dismissCount,
            Threshold = FieldWorkLearning.DismissalPromptThreshold,
            TemplateCode = templateCode,
            PracticeCategory = practiceKey,
            CurrentPreferenceMode = mode.ToApiString(),
            PromptMessage = greek
                ? "Δεν θέλεις να προτείνουμε αυτή την εργασία για το χωράφι;"
                : "Should we stop proposing this task for the field?"
        };
    }

    public async Task<FieldWorkProfileDto> ApplyDismissalAsync(
        string fieldId,
        DismissalLearningApplyDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanEditWorkProfileAsync(fieldId, userId, userRole, cancellationToken);

        var templateCode = RequireTemplate(dto.TemplateCode);
        var choice = DismissalLearningChoiceExtensions.FromApiString(dto.Choice)
            ?? throw new ValidationException("Choice must be dont_propose, ask_when_indicated, or keep_proposing.");

        var profile = await RequireActiveProfileAsync(fieldId, cancellationToken);
        var practiceKey = FieldWorkLearning.PracticeKeyFromTemplate(templateCode);
        var practice = FieldWorkLearning.GetPractice(profile, practiceKey)
            ?? throw new ValidationException("This template is not linked to a personalised practice.");

        var nextMode = FieldWorkLearning.ResolveDismissalPreference(choice, practice.PreferenceMode)
            ?? throw new ValidationException("Invalid dismissal learning choice.");

        var now = _clock.UtcNow;
        var previous = practice.PreferenceMode;
        practice.PreferenceMode = nextMode;
        practice.Source = PreferenceSource.LearnedFromBehaviour;
        practice.ConfirmedAt = now;
        profile.UpdatedByUserId = userId;
        profile.UpdatedAt = now;
        profile.ProfileVersion += 1;

        var updated = await _profiles.UpdateAsync(profile, cancellationToken);

        FieldWorkProductEvents.Emit(
            _logger,
            FieldWorkProductEvents.PreferenceChanged,
            fieldId,
            userId,
            templateCode,
            practiceKey,
            $"{previous.ToApiString()}->{nextMode.ToApiString()};choice={choice.ToApiString()};confirmedBy={userId}");

        return FieldWorkMapper.ToDto(updated, language);
    }

    public async Task<CompletionLearningEvaluateResultDto> EvaluateCompletionAsync(
        string fieldId,
        CompletionLearningEvaluateDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);

        var templateCode = RequireTemplate(dto.TemplateCode);
        var resultYear = dto.ResultYear ?? AthensTime.CalendarYear(_clock.UtcNow);
        var shouldPrompt = FieldWorkLearning.ShouldPromptCompletionFrequency(templateCode, dto.Outcome);
        var practiceKey = FieldWorkLearning.PracticeKeyFromTemplate(templateCode);
        var nextYear = resultYear + 2;

        var greek = !language.StartsWith("en", StringComparison.OrdinalIgnoreCase);
        return new CompletionLearningEvaluateResultDto
        {
            ShouldPrompt = shouldPrompt,
            TemplateCode = templateCode,
            PracticeCategory = practiceKey,
            ResultYear = resultYear,
            SuggestNextYear = nextYear,
            PromptMessage = shouldPrompt
                ? (greek
                    ? $"Το κλάδεμα καταγράφηκε για το {resultYear}. Να το ξαναπροτείνουμε το {nextYear};"
                    : $"Pruning was recorded for {resultYear}. Propose again in {nextYear}?")
                : string.Empty
        };
    }

    public async Task<FieldWorkProfileDto> ApplyCompletionAsync(
        string fieldId,
        CompletionLearningApplyDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanEditWorkProfileAsync(fieldId, userId, userRole, cancellationToken);

        var templateCode = RequireTemplate(dto.TemplateCode);
        if (!string.Equals(templateCode, "T06", StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("Completion frequency learning currently applies to pruning (T06) only.");
        }

        var choice = CompletionFrequencyChoiceExtensions.FromApiString(dto.Choice)
            ?? throw new ValidationException(
                "Choice must be every_2_years, every_year, when_needed, or no_change.");

        // Explicit no-change: do not write LastPerformedYear or frequency (silent update forbidden).
        if (choice == CompletionFrequencyChoice.NoChange)
        {
            var unchanged = await RequireActiveProfileAsync(fieldId, cancellationToken);
            return FieldWorkMapper.ToDto(unchanged, language);
        }

        var application = FieldWorkLearning.ResolveCompletionFrequency(choice, dto.ResultYear)
            ?? throw new ValidationException("Invalid completion frequency choice.");

        var profile = await RequireActiveProfileAsync(fieldId, cancellationToken);
        var pruning = profile.Pruning;
        var now = _clock.UtcNow;

        pruning.LastPerformedYear = application.LastPerformedYear;
        pruning.FrequencyType = application.FrequencyType;
        pruning.FrequencyValue = application.FrequencyValue;
        pruning.DatePrecision = DatePrecision.Year;
        pruning.Source = PreferenceSource.LearnedFromBehaviour;
        pruning.ConfirmedAt = now;
        profile.UpdatedByUserId = userId;
        profile.UpdatedAt = now;
        profile.ProfileVersion += 1;

        var updated = await _profiles.UpdateAsync(profile, cancellationToken);

        FieldWorkProductEvents.Emit(
            _logger,
            FieldWorkProductEvents.PreferenceChanged,
            fieldId,
            userId,
            templateCode,
            "pruning",
            $"completionFrequency={choice.ToApiString()};lastYear={application.LastPerformedYear};confirmedBy={userId}");

        return FieldWorkMapper.ToDto(updated, language);
    }

    public async Task<FieldWorkProfileDto> MarkReviewedAsync(
        string fieldId,
        MarkProfileReviewedDto? dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanEditWorkProfileAsync(fieldId, userId, userRole, cancellationToken);

        var profile = await RequireActiveProfileAsync(fieldId, cancellationToken);
        var now = _clock.UtcNow;
        profile.LastReviewedAt = now;
        profile.UpdatedByUserId = userId;
        profile.UpdatedAt = now;
        // Align stored onboarding version when user acknowledges incremental questions.
        if (profile.OnboardingVersion < FieldWorkProfile.CurrentOnboardingVersion)
        {
            profile.OnboardingVersion = FieldWorkProfile.CurrentOnboardingVersion;
        }

        profile.ProfileVersion += 1;
        var updated = await _profiles.UpdateAsync(profile, cancellationToken);

        FieldWorkProductEvents.Emit(
            _logger,
            FieldWorkProductEvents.ProfileReviewed,
            fieldId,
            userId,
            detail: dto?.IncrementalQuestionId);

        return FieldWorkMapper.ToDto(updated, language);
    }

    public async Task<FieldWorkLearningStatusDto> GetStatusAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);

        var profile = await _profiles.GetByFieldIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field-work profile not found.");

        var pending = FieldWorkLearning.IncrementalQuestionIdsForVersion(
            profile.OnboardingVersion,
            FieldWorkProfile.CurrentOnboardingVersion);

        return new FieldWorkLearningStatusDto
        {
            AnnualReviewDue = FieldWorkLearning.IsAnnualReviewDue(profile.LastReviewedAt, _clock.UtcNow),
            LastReviewedAt = profile.LastReviewedAt,
            OnboardingVersion = profile.OnboardingVersion,
            CurrentOnboardingVersion = FieldWorkProfile.CurrentOnboardingVersion,
            HasIncrementalQuestions = pending.Count > 0,
            PendingIncrementalQuestionIds = pending.ToList()
        };
    }

    private async Task<int> CountDismissalsAsync(
        string fieldId,
        string templateCode,
        CancellationToken cancellationToken)
    {
        var dismissed = await _proposals.QueryAsync(
            new TaskProposalQuery
            {
                FieldId = fieldId,
                TemplateCode = templateCode,
                Statuses =
                [
                    TaskProposalStatus.DismissedForField,
                    TaskProposalStatus.DismissedForYear
                ]
            },
            cancellationToken);

        return dismissed.Count;
    }

    private async Task<FieldWorkProfile> RequireActiveProfileAsync(
        string fieldId,
        CancellationToken cancellationToken)
    {
        var profile = await _profiles.GetByFieldIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field-work profile not found.");

        if (profile.Status != FieldWorkProfileStatus.Active)
        {
            throw new ValidationException("Learning preferences require an active field-work profile.");
        }

        return profile;
    }

    private static string RequireTemplate(string? templateCode)
    {
        if (string.IsNullOrWhiteSpace(templateCode))
        {
            throw new ValidationException("Template code is required.");
        }

        return templateCode.Trim().ToUpperInvariant();
    }
}
