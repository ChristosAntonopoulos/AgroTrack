using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.FieldWork;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Application.Services;

public interface IFieldWorkPlanPreviewService
{
    /// <summary>
    /// Dry-run catalogue eligibility for the field's work profile.
    /// Prefers Draft answers before activate. Never creates FieldTasks or TaskProposals.
    /// </summary>
    Task<FieldWorkPlanPreviewDto> GetAsync(
        string fieldId,
        int? resultYear,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);
}

public class FieldWorkPlanPreviewService : IFieldWorkPlanPreviewService
{
    private readonly IFieldWorkProfileRepository _profiles;
    private readonly IFieldRepository _fields;
    private readonly IFieldTaskRepository _fieldTasks;
    private readonly ITaskExecutionRepository _executions;
    private readonly IFieldWorkAuthorizationService _auth;
    private readonly IDateTimeProvider _clock;

    public FieldWorkPlanPreviewService(
        IFieldWorkProfileRepository profiles,
        IFieldRepository fields,
        IFieldTaskRepository fieldTasks,
        ITaskExecutionRepository executions,
        IFieldWorkAuthorizationService auth,
        IDateTimeProvider clock)
    {
        _profiles = profiles;
        _fields = fields;
        _fieldTasks = fieldTasks;
        _executions = executions;
        _auth = auth;
        _clock = clock;
    }

    public async Task<FieldWorkPlanPreviewDto> GetAsync(
        string fieldId,
        int? resultYear,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);

        _ = await _fields.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        var profile = await _profiles.GetByFieldIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field-work profile not found.");

        var now = _clock.UtcNow;
        var year = resultYear ?? profile.ResultYearCreated;
        if (year <= 0)
        {
            year = AthensTime.CalendarYear(now);
        }

        // Eligibility personalises only Active profiles — preview treats Draft answers as Active
        // without persisting that status.
        var usedDraft = profile.Status == FieldWorkProfileStatus.Draft;
        var originalStatus = profile.Status;
        profile.Status = FieldWorkProfileStatus.Active;

        try
        {
            var completedCounts = await BuildCompletedCountsAsync(fieldId, year, cancellationToken);
            var hasAnalysisEvidence = completedCounts.ContainsKey("T03")
                || completedCounts.ContainsKey("T16")
                || profile.CurrentYearDeclaredWork.Any(d =>
                    d.ResultYear == year
                    && d.Completion is DeclaredWorkCompletion.Yes or DeclaredWorkCompletion.Partially
                    && d.Category.Contains("analysis", StringComparison.OrdinalIgnoreCase));

            var enabled = new List<FieldWorkPlanPreviewItemDto>();
            var askFirst = new List<FieldWorkPlanPreviewItemDto>();
            var suppressed = new List<FieldWorkPlanPreviewItemDto>();

            foreach (var entry in FieldWorkCatalogue.All)
            {
                var category = FieldWorkProfileEligibility.ResolvePracticeCategory(entry);
                var result = FieldWorkProfileEligibility.EvaluateTemplateForField(
                    new TemplateEligibilityContext
                    {
                        Entry = entry,
                        FieldId = fieldId,
                        Profile = profile,
                        ResultYear = year,
                        UtcNow = now,
                        CompletedCountsByTemplate = completedCounts,
                        HasAnalysisEvidence = hasAnalysisEvidence,
                        HasObservationEvidence = false,
                        HasAgronomistEvidence =
                            profile.Fertilisation.DecisionMaker == WorkDecisionMaker.Agronomist
                            || profile.PestManagement.DecisionApproach == PestDecisionApproach.Agronomist
                    });

                var item = ToItem(entry, category, result, language);
                switch (result.Status)
                {
                    case TemplateEligibilityStatus.AskFirst:
                        askFirst.Add(item);
                        break;
                    case TemplateEligibilityStatus.Suppressed:
                        suppressed.Add(item);
                        break;
                    default:
                        enabled.Add(item);
                        break;
                }
            }

            return new FieldWorkPlanPreviewDto
            {
                FieldId = fieldId,
                ResultYear = year,
                ProfileStatus = originalStatus.ToApiString(),
                UsedDraftAsPreview = usedDraft,
                EnabledCount = enabled.Count,
                AskFirstCount = askFirst.Count,
                SuppressedCount = suppressed.Count,
                Enabled = enabled,
                AskFirst = askFirst,
                Suppressed = suppressed
            };
        }
        finally
        {
            profile.Status = originalStatus;
        }
    }

    private static FieldWorkPlanPreviewItemDto ToItem(
        FieldWorkCatalogueEntry entry,
        PracticeCategory category,
        TemplateEligibilityResult result,
        string language)
    {
        var en = language.StartsWith("en", StringComparison.OrdinalIgnoreCase);
        return new FieldWorkPlanPreviewItemDto
        {
            TemplateCode = entry.Code,
            TemplateName = en ? entry.EnglishName : entry.GreekName,
            EligibilityStatus = result.Status.ToApiString(),
            ReasonCode = result.ReasonCode,
            Reason = FieldWorkProfileEligibilityLabels.ForReason(result.ReasonCode, language),
            PracticeCategory = MapPracticeCategory(category)
        };
    }

    /// <summary>Maps eligibility practice buckets to onboarding jump-back keys.</summary>
    public static string MapPracticeCategory(PracticeCategory category) => category switch
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

    private async Task<Dictionary<string, int>> BuildCompletedCountsAsync(
        string fieldId,
        int resultYear,
        CancellationToken cancellationToken)
    {
        var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        var completedTasks = await _fieldTasks.QueryAsync(
            new FieldTaskQuery
            {
                FieldId = fieldId,
                ResultYear = resultYear,
                Statuses = [FieldTaskStatus.Completed]
            },
            cancellationToken);

        foreach (var task in completedTasks.Where(t => !string.IsNullOrWhiteSpace(t.TemplateCode)))
        {
            counts[task.TemplateCode!] = counts.GetValueOrDefault(task.TemplateCode!) + 1;
        }

        var executions = await _executions.GetByFieldAndYearAsync(fieldId, resultYear, cancellationToken);
        var activeExecutionTaskIds = executions
            .Where(e => e.IsActive
                        && e.Outcome is TaskExecutionOutcome.Completed or TaskExecutionOutcome.PartiallyCompleted)
            .Select(e => e.TaskId)
            .ToHashSet(StringComparer.Ordinal);

        if (activeExecutionTaskIds.Count == 0)
        {
            return counts;
        }

        var relatedTasks = await _fieldTasks.QueryAsync(
            new FieldTaskQuery { FieldId = fieldId, ResultYear = resultYear },
            cancellationToken);

        foreach (var task in relatedTasks.Where(t =>
                     activeExecutionTaskIds.Contains(t.Id) && !string.IsNullOrWhiteSpace(t.TemplateCode)))
        {
            if (task.Status == FieldTaskStatus.Completed)
            {
                continue;
            }

            counts[task.TemplateCode!] = counts.GetValueOrDefault(task.TemplateCode!) + 1;
        }

        return counts;
    }
}
