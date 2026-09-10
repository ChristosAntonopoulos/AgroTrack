using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Application.Services;

public interface ITaskProposalService
{
    Task<IReadOnlyList<TaskProposalDto>> ListAsync(
        string? fieldId,
        int? resultYear,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<TaskProposalDto> AcceptAsync(
        string proposalId,
        AcceptTaskProposalDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<TaskProposalDto> SnoozeAsync(
        string proposalId,
        SnoozeTaskProposalDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<TaskProposalDto> DismissAsync(
        string proposalId,
        DismissTaskProposalDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    /// <summary>Internal/test helper to persist a proposal with eligibility checks.</summary>
    Task<TaskProposal> CreateProposalAsync(TaskProposal proposal, CancellationToken cancellationToken = default);
}

public class TaskProposalService : ITaskProposalService
{
    private readonly ITaskProposalRepository _proposals;
    private readonly IFieldTaskRepository _fieldTasks;
    private readonly IFieldWorkTaskTemplateRepository _templates;
    private readonly IFieldWorkTaskTemplateVersionRepository _versions;
    private readonly IFieldWorkProfileRepository _profiles;
    private readonly IFieldWorkAuthorizationService _auth;
    private readonly IDateTimeProvider _clock;
    private readonly IFieldTaskWeatherEvaluationService _weatherEvaluation;
    private readonly ILogger<TaskProposalService> _logger;

    public TaskProposalService(
        ITaskProposalRepository proposals,
        IFieldTaskRepository fieldTasks,
        IFieldWorkTaskTemplateRepository templates,
        IFieldWorkTaskTemplateVersionRepository versions,
        IFieldWorkProfileRepository profiles,
        IFieldWorkAuthorizationService auth,
        IDateTimeProvider clock,
        IFieldTaskWeatherEvaluationService weatherEvaluation,
        ILogger<TaskProposalService> logger)
    {
        _proposals = proposals;
        _fieldTasks = fieldTasks;
        _templates = templates;
        _versions = versions;
        _profiles = profiles;
        _auth = auth;
        _clock = clock;
        _weatherEvaluation = weatherEvaluation;
        _logger = logger;
    }

    public async Task<IReadOnlyList<TaskProposalDto>> ListAsync(
        string? fieldId,
        int? resultYear,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(fieldId))
        {
            await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);
        }

        var query = new TaskProposalQuery
        {
            FieldId = fieldId,
            ResultYear = resultYear,
            ActiveOnly = true
        };

        var proposals = await _proposals.QueryAsync(query, cancellationToken);
        var now = _clock.UtcNow;

        var visible = proposals
            .Where(p => p.Status != TaskProposalStatus.DismissedForYear)
            .Where(p => p.Status != TaskProposalStatus.DismissedForField)
            .Where(p => p.Status != TaskProposalStatus.Expired)
            .Where(p => p.Status != TaskProposalStatus.Accepted)
            .Where(p => p.Status != TaskProposalStatus.Snoozed || p.SnoozeUntil is null || p.SnoozeUntil <= now)
            .ToList();

        return visible.Select(p => FieldWorkMapper.ToDto(p, language)).ToList();
    }

    public async Task<TaskProposalDto> AcceptAsync(
        string proposalId,
        AcceptTaskProposalDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var proposal = await _proposals.GetByIdAsync(proposalId, cancellationToken)
            ?? throw new NotFoundException("Task proposal not found.");

        await _auth.EnsureCanManageProposalsAsync(proposal.FieldId, userId, userRole, cancellationToken);
        await _auth.EnsureFieldEligibleForProposalsAsync(proposal.FieldId, cancellationToken);

        if (proposal.Status == TaskProposalStatus.Accepted && !string.IsNullOrEmpty(proposal.AcceptedTaskId))
        {
            var existing = await _fieldTasks.GetByIdAsync(proposal.AcceptedTaskId, cancellationToken)
                ?? await _fieldTasks.GetByProposalIdAsync(proposal.Id, cancellationToken);
            if (existing != null)
            {
                return FieldWorkMapper.ToDto(proposal, language);
            }
        }

        if (proposal.Status is TaskProposalStatus.DismissedForYear or TaskProposalStatus.DismissedForField
            or TaskProposalStatus.Expired)
        {
            throw new ValidationException("This proposal can no longer be accepted.");
        }

        var existingByProposal = await _fieldTasks.GetByProposalIdAsync(proposal.Id, cancellationToken);
        if (existingByProposal != null)
        {
            proposal.Status = TaskProposalStatus.Accepted;
            proposal.AcceptedTaskId = existingByProposal.Id;
            proposal.Decision = TaskProposalDecision.Accept;
            proposal.DecisionAt = _clock.UtcNow;
            proposal.DecisionByUserId = userId;
            await _proposals.UpdateAsync(proposal, cancellationToken);
            return FieldWorkMapper.ToDto(proposal, language);
        }

        var version = await _versions.GetByCodeAndVersionAsync(
            proposal.TemplateCode,
            proposal.TemplateVersion,
            cancellationToken)
            ?? await _versions.GetCurrentAsync(proposal.TemplateCode, cancellationToken);

        var template = await _templates.GetByCodeAsync(proposal.TemplateCode, cancellationToken);
        var now = _clock.UtcNow;
        var plannedStart = dto.PlannedStart ?? proposal.RecommendedWindowStart ?? now;
        var resultYear = ResultYearResolver.Resolve(plannedStart, dto.ResultYear ?? proposal.ResultYear, now);

        var title = version?.GreekName
            ?? template?.GreekName
            ?? proposal.TemplateCode;

        // Pre-suggest default assignee from Active profile when caller left it empty (user can change on form).
        var assignedUserId = dto.AssignedUserId;
        if (string.IsNullOrWhiteSpace(assignedUserId))
        {
            var profile = await _profiles.GetByFieldIdAsync(proposal.FieldId, cancellationToken);
            assignedUserId = FieldWorkLearning.SuggestDefaultAssigneeId(
                profile,
                proposal.TemplateCode,
                userId);
        }

        var task = new FieldTask
        {
            FieldId = proposal.FieldId,
            ResultYear = resultYear,
            TemplateCode = proposal.TemplateCode,
            TemplateVersion = proposal.TemplateVersion,
            Title = title,
            Description = proposal.GreekExplanation,
            Status = FieldTaskStatus.Planned,
            PlannedStart = plannedStart,
            PlannedEnd = dto.PlannedEnd ?? proposal.RecommendedWindowEnd,
            AssignedUserId = assignedUserId,
            AssignedCollaboratorId = dto.AssignedCollaboratorId,
            ResponsibleUserId = userId,
            ProposalId = proposal.Id,
            ChecklistSnapshot = version is null
                ? []
                : ChecklistSnapshotFactory.CopyFromTemplate(version.DefaultChecklist),
            Notes = dto.Notes,
            WeatherSuitability = WeatherSuitability.Unknown,
            CreatedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _fieldTasks.CreateAsync(task, cancellationToken);

        try
        {
            await _weatherEvaluation.EvaluateTaskAsync(created, language, cancellationToken);
        }
        catch
        {
            // Keep Unknown; acceptance must not fail on weather.
        }

        proposal.Status = TaskProposalStatus.Accepted;
        proposal.Decision = TaskProposalDecision.Accept;
        proposal.DecisionAt = now;
        proposal.DecisionByUserId = userId;
        proposal.AcceptedTaskId = created.Id;
        proposal.UpdatedAt = now;
        await _proposals.UpdateAsync(proposal, cancellationToken);

        return FieldWorkMapper.ToDto(proposal, language);
    }

    public async Task<TaskProposalDto> SnoozeAsync(
        string proposalId,
        SnoozeTaskProposalDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var proposal = await _proposals.GetByIdAsync(proposalId, cancellationToken)
            ?? throw new NotFoundException("Task proposal not found.");

        await _auth.EnsureCanManageProposalsAsync(proposal.FieldId, userId, userRole, cancellationToken);

        if (!proposal.Status.IsOpen() && proposal.Status != TaskProposalStatus.Active)
        {
            throw new ValidationException("Only open proposals can be snoozed.");
        }

        var now = _clock.UtcNow;
        proposal.Status = TaskProposalStatus.Snoozed;
        proposal.Decision = TaskProposalDecision.RemindLater;
        proposal.DecisionAt = now;
        proposal.DecisionByUserId = userId;
        proposal.SnoozeUntil = dto.Until ?? now.AddDays(7);
        proposal.UpdatedAt = now;
        await _proposals.UpdateAsync(proposal, cancellationToken);
        return FieldWorkMapper.ToDto(proposal, language);
    }

    public async Task<TaskProposalDto> DismissAsync(
        string proposalId,
        DismissTaskProposalDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var proposal = await _proposals.GetByIdAsync(proposalId, cancellationToken)
            ?? throw new NotFoundException("Task proposal not found.");

        await _auth.EnsureCanManageProposalsAsync(proposal.FieldId, userId, userRole, cancellationToken);

        var decision = TaskProposalDecisionExtensions.FromApiString(dto.Decision)
            ?? TaskProposalDecision.DismissForYear;

        if (decision is not (TaskProposalDecision.NotForThisField or TaskProposalDecision.DismissForYear))
        {
            throw new ValidationException("Decision must be not_for_this_field or dismiss_for_year.");
        }

        var now = _clock.UtcNow;
        proposal.Decision = decision;
        proposal.DecisionAt = now;
        proposal.DecisionByUserId = userId;
        proposal.Status = decision == TaskProposalDecision.NotForThisField
            ? TaskProposalStatus.DismissedForField
            : TaskProposalStatus.DismissedForYear;
        proposal.UpdatedAt = now;
        await _proposals.UpdateAsync(proposal, cancellationToken);

        FieldWorkProductEvents.Emit(
            _logger,
            FieldWorkProductEvents.ProposalDismissed,
            proposal.FieldId,
            userId,
            proposal.TemplateCode,
            FieldWorkLearning.PracticeKeyFromTemplate(proposal.TemplateCode),
            decision.ToApiString());

        return FieldWorkMapper.ToDto(proposal, language);
    }

    public async Task<TaskProposal> CreateProposalAsync(
        TaskProposal proposal,
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureFieldEligibleForProposalsAsync(proposal.FieldId, cancellationToken);

        if (await _proposals.HasDismissedForYearAsync(
                proposal.FieldId,
                proposal.TemplateCode,
                proposal.ResultYear,
                cancellationToken))
        {
            throw new ValidationException("This template was dismissed for the result year.");
        }

        if (string.IsNullOrWhiteSpace(proposal.DedupKey))
        {
            var reason = proposal.ReasonCodes.FirstOrDefault() ?? "default";
            proposal.DedupKey = ProposalDedupKey.Build(
                proposal.FieldId,
                proposal.TemplateCode,
                reason,
                proposal.RecommendedWindowStart,
                proposal.RecommendedWindowEnd);
        }

        var existing = await _proposals.GetOpenByDedupKeyAsync(proposal.DedupKey, cancellationToken);
        if (existing != null)
        {
            return existing;
        }

        var now = _clock.UtcNow;
        proposal.GeneratedAt = now;
        proposal.CreatedAt = now;
        proposal.UpdatedAt = now;
        return await _proposals.CreateAsync(proposal, cancellationToken);
    }
}
