using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.FieldWork;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Application.Services;

public interface ITaskProposalEngine
{
    Task<IReadOnlyList<TaskProposalDto>> EvaluateFieldAsync(
        string fieldId,
        int? resultYear,
        string? userId = null,
        string? userRole = null,
        string language = "el",
        bool hasWeatherData = false,
        WeatherSuitability observedWeather = WeatherSuitability.Unknown,
        CancellationToken cancellationToken = default);

    Task<int> EvaluateActiveFieldsAsync(CancellationToken cancellationToken = default);
}

public class TaskProposalEngine : ITaskProposalEngine
{
    private readonly IFieldRepository _fields;
    private readonly ITaskProposalRepository _proposals;
    private readonly IFieldTaskRepository _fieldTasks;
    private readonly ITaskExecutionRepository _executions;
    private readonly IFieldPhenologyObservationRepository _phenology;
    private readonly IOfficialAgriculturalWarningRepository _warnings;
    private readonly IFieldWorkProfileRepository _profiles;
    private readonly ITaskProposalService _proposalService;
    private readonly IFieldWorkAuthorizationService _auth;
    private readonly IDateTimeProvider _clock;
    private readonly IFieldWorkEventSignalCollector _eventSignals;

    public TaskProposalEngine(
        IFieldRepository fields,
        ITaskProposalRepository proposals,
        IFieldTaskRepository fieldTasks,
        ITaskExecutionRepository executions,
        IFieldPhenologyObservationRepository phenology,
        IOfficialAgriculturalWarningRepository warnings,
        IFieldWorkProfileRepository profiles,
        ITaskProposalService proposalService,
        IFieldWorkAuthorizationService auth,
        IDateTimeProvider clock,
        IFieldWorkEventSignalCollector eventSignals)
    {
        _fields = fields;
        _proposals = proposals;
        _fieldTasks = fieldTasks;
        _executions = executions;
        _phenology = phenology;
        _warnings = warnings;
        _profiles = profiles;
        _proposalService = proposalService;
        _auth = auth;
        _clock = clock;
        _eventSignals = eventSignals;
    }

    public async Task<IReadOnlyList<TaskProposalDto>> EvaluateFieldAsync(
        string fieldId,
        int? resultYear,
        string? userId = null,
        string? userRole = null,
        string language = "el",
        bool hasWeatherData = false,
        WeatherSuitability observedWeather = WeatherSuitability.Unknown,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrEmpty(userId) && !string.IsNullOrEmpty(userRole))
        {
            await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);
        }

        var field = await _fields.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        var now = _clock.UtcNow;
        var year = resultYear ?? AthensTime.CalendarYear(now);

        if (!ProposalEligibility.CanReceiveProposals(field.Status))
        {
            return [];
        }

        var observations = await _phenology.GetByFieldIdAsync(fieldId, cancellationToken);
        var phenology = PhenologyResolver.Resolve(observations);

        var existingProposals = await _proposals.QueryAsync(
            new TaskProposalQuery { FieldId = fieldId, ResultYear = year },
            cancellationToken);

        var dismissed = existingProposals
            .Where(p => p.Status == TaskProposalStatus.DismissedForYear)
            .Select(p => p.TemplateCode)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var openTasks = await _fieldTasks.QueryAsync(
            new FieldTaskQuery
            {
                FieldId = fieldId,
                ResultYear = year,
                Statuses =
                [
                    FieldTaskStatus.Planned,
                    FieldTaskStatus.Ready,
                    FieldTaskStatus.InProgress,
                    FieldTaskStatus.Blocked
                ]
            },
            cancellationToken);

        var openCodes = openTasks
            .Where(t => !string.IsNullOrWhiteSpace(t.TemplateCode))
            .Select(t => t.TemplateCode!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var warnings = await _warnings.GetActiveForFieldAsync(fieldId, cancellationToken);
        var eventSignals = await _eventSignals.CollectAsync(fieldId, phenology, warnings, cancellationToken);

        var profileEntity = await _profiles.GetByFieldIdAsync(fieldId, cancellationToken);
        var activeProfile = profileEntity is { Status: FieldWorkProfileStatus.Active }
            ? profileEntity
            : null;

        var completedCounts = await BuildCompletedCountsAsync(fieldId, year, cancellationToken);
        var hasAnalysisEvidence = completedCounts.ContainsKey("T03")
            || completedCounts.ContainsKey("T16")
            || activeProfile?.CurrentYearDeclaredWork.Any(d =>
                d.ResultYear == year
                && d.Completion is DeclaredWorkCompletion.Yes or DeclaredWorkCompletion.Partially
                && d.Category.Contains("analysis", StringComparison.OrdinalIgnoreCase)) == true;

        var context = new ProposalEvaluationContext
        {
            FieldId = field.Id,
            FieldStatus = field.Status,
            IsIrrigated = FieldWorkProfileEligibility.ResolveIsIrrigated(field.IrrigationStatus, activeProfile),
            ResultYear = year,
            UtcNow = now,
            Phenology = phenology,
            DismissedTemplateCodesForYear = dismissed,
            ActiveWarnings = warnings,
            HasWeatherData = hasWeatherData,
            ObservedWeatherSuitability = hasWeatherData ? observedWeather : WeatherSuitability.Unknown,
            OpenTaskTemplateCodes = openCodes,
            EventSignals = eventSignals,
            WorkProfile = activeProfile,
            CompletedCountsByTemplate = completedCounts,
            HasAnalysisEvidence = hasAnalysisEvidence,
            HasObservationEvidence = phenology.IsKnown,
            HasAgronomistEvidence = activeProfile?.Fertilisation.DecisionMaker == WorkDecisionMaker.Agronomist
                || activeProfile?.PestManagement.DecisionApproach == PestDecisionApproach.Agronomist
        };

        var candidates = ProposalRuleEvaluator.Evaluate(context);
        var created = new List<TaskProposal>();

        foreach (var candidate in candidates)
        {
            var reason = candidate.ReasonCodes.FirstOrDefault() ?? candidate.RuleCode;
            var proposal = new TaskProposal
            {
                FieldId = field.Id,
                ResultYear = year,
                TemplateCode = candidate.TemplateCode,
                TemplateVersion = candidate.TemplateVersion,
                SourceType = candidate.SourceType,
                SourceReference = candidate.SourceReference ?? candidate.RuleCode,
                Confidence = candidate.Confidence,
                ReasonCodes = candidate.ReasonCodes,
                GreekExplanation = candidate.GreekExplanation,
                EnglishExplanation = candidate.EnglishExplanation,
                RecommendedWindowStart = candidate.WindowStart,
                RecommendedWindowEnd = candidate.WindowEnd,
                Status = TaskProposalStatus.Active,
                DedupKey = ProposalDedupKey.Build(
                    field.Id,
                    candidate.TemplateCode,
                    reason,
                    candidate.WindowStart,
                    candidate.WindowEnd)
            };

            var saved = await _proposalService.CreateProposalAsync(proposal, cancellationToken);
            created.Add(saved);
        }

        // Expire stale open proposals outside their window (do not edit accepted tasks).
        foreach (var open in existingProposals.Where(p => p.Status.IsOpen()))
        {
            if (open.ValidUntil.HasValue && open.ValidUntil < now)
            {
                open.Status = TaskProposalStatus.Expired;
                open.UpdatedAt = now;
                await _proposals.UpdateAsync(open, cancellationToken);
            }
        }

        return created
            .GroupBy(p => p.Id)
            .Select(g => g.First())
            .Select(p => FieldWorkMapper.ToDto(p, language))
            .ToList();
    }

    public async Task<int> EvaluateActiveFieldsAsync(CancellationToken cancellationToken = default)
    {
        var fields = await _fields.GetByStatusAsync(FieldStatus.Active, cancellationToken);
        var count = 0;
        foreach (var field in fields)
        {
            if (!ProposalEligibility.CanReceiveProposals(field.Status))
            {
                continue;
            }

            var created = await EvaluateFieldAsync(field.Id, resultYear: null, cancellationToken: cancellationToken);
            count += created.Count;
        }

        return count;
    }

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
            .Where(e => e.IsActive && e.Outcome is TaskExecutionOutcome.Completed or TaskExecutionOutcome.PartiallyCompleted)
            .Select(e => e.TaskId)
            .ToHashSet(StringComparer.Ordinal);

        if (activeExecutionTaskIds.Count == 0)
        {
            return counts;
        }

        // Map executions without a Completed FieldTask status via task id → template.
        var relatedTasks = await _fieldTasks.QueryAsync(
            new FieldTaskQuery { FieldId = fieldId, ResultYear = resultYear },
            cancellationToken);

        foreach (var task in relatedTasks.Where(t =>
                     activeExecutionTaskIds.Contains(t.Id) && !string.IsNullOrWhiteSpace(t.TemplateCode)))
        {
            // Avoid double-counting tasks already counted as Completed.
            if (task.Status == FieldTaskStatus.Completed)
            {
                continue;
            }

            counts[task.TemplateCode!] = counts.GetValueOrDefault(task.TemplateCode!) + 1;
        }

        return counts;
    }
}
