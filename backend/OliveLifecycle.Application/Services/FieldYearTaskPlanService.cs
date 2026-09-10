using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Application.Services;

public interface IFieldYearTaskPlanService
{
    Task<FieldYearTaskPlanDto> GetAsync(
        string fieldId,
        int year,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);
}

public class FieldYearTaskPlanService : IFieldYearTaskPlanService
{
    private readonly IFieldWorkAuthorizationService _auth;
    private readonly IFieldWorkTaskTemplateRepository _templates;
    private readonly ITaskProposalRepository _proposals;
    private readonly IFieldTaskRepository _tasks;
    private readonly ITaskProposalEngine _engine;
    private readonly IDateTimeProvider _clock;

    public FieldYearTaskPlanService(
        IFieldWorkAuthorizationService auth,
        IFieldWorkTaskTemplateRepository templates,
        ITaskProposalRepository proposals,
        IFieldTaskRepository tasks,
        ITaskProposalEngine engine,
        IDateTimeProvider clock)
    {
        _auth = auth;
        _templates = templates;
        _proposals = proposals;
        _tasks = tasks;
        _engine = engine;
        _clock = clock;
    }

    public async Task<FieldYearTaskPlanDto> GetAsync(
        string fieldId,
        int year,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);

        // Refresh proposals for the year (idempotent).
        await _engine.EvaluateFieldAsync(
            fieldId,
            year,
            userId,
            userRole,
            language,
            cancellationToken: cancellationToken);

        var templates = await _templates.GetActiveAsync(cancellationToken);
        var proposals = await _proposals.QueryAsync(
            new TaskProposalQuery { FieldId = fieldId, ResultYear = year, ActiveOnly = true },
            cancellationToken);
        var tasks = await _tasks.QueryAsync(
            new FieldTaskQuery { FieldId = fieldId, ResultYear = year },
            cancellationToken);

        var now = _clock.UtcNow;
        var visibleProposals = proposals
            .Where(p => p.Status != TaskProposalStatus.Snoozed || p.SnoozeUntil is null || p.SnoozeUntil <= now)
            .Select(p => FieldWorkMapper.ToDto(p, language))
            .ToList();

        return new FieldYearTaskPlanDto
        {
            FieldId = fieldId,
            ResultYear = year,
            EvaluatedAt = now,
            Catalogue = templates.Select(t => FieldWorkMapper.ToDto(t, language)).ToList(),
            Proposals = visibleProposals,
            Tasks = tasks.Select(t => FieldWorkMapper.ToDto(t, language)).ToList(),
            InWindowTemplateCodes = FieldWorkCatalogue.All
                .Where(e => CandidateWindowCalculator.Contains(e.CandidateMonthRange, now, year))
                .Select(e => e.Code)
                .ToList()
        };
    }
}
