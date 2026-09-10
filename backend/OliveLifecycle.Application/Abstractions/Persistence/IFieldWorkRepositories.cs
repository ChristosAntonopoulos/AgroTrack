using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IFieldWorkTaskTemplateRepository : IRepository<FieldWorkTaskTemplate, string>
{
    Task<FieldWorkTaskTemplate?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FieldWorkTaskTemplate>> GetActiveAsync(CancellationToken cancellationToken = default);
}

public interface IFieldWorkTaskTemplateVersionRepository : IRepository<FieldWorkTaskTemplateVersion, string>
{
    Task<FieldWorkTaskTemplateVersion?> GetByCodeAndVersionAsync(
        string templateCode,
        int version,
        CancellationToken cancellationToken = default);

    Task<FieldWorkTaskTemplateVersion?> GetCurrentAsync(
        string templateCode,
        CancellationToken cancellationToken = default);
}

public interface ITaskProposalRepository : IRepository<TaskProposal, string>
{
    Task<IReadOnlyList<TaskProposal>> QueryAsync(
        TaskProposalQuery query,
        CancellationToken cancellationToken = default);

    Task<TaskProposal?> GetOpenByDedupKeyAsync(
        string dedupKey,
        CancellationToken cancellationToken = default);

    Task<bool> HasDismissedForYearAsync(
        string fieldId,
        string templateCode,
        int resultYear,
        CancellationToken cancellationToken = default);
}

public sealed class TaskProposalQuery
{
    public string? FieldId { get; init; }
    public IReadOnlyList<string>? FieldIds { get; init; }
    public int? ResultYear { get; init; }
    public TaskProposalStatus? Status { get; init; }
    public IReadOnlyList<TaskProposalStatus>? Statuses { get; init; }
    public string? TemplateCode { get; init; }
    public bool ActiveOnly { get; init; }
}

public interface IFieldTaskRepository : IRepository<FieldTask, string>
{
    Task<IReadOnlyList<FieldTask>> QueryAsync(
        FieldTaskQuery query,
        CancellationToken cancellationToken = default);

    Task<FieldTask?> GetByProposalIdAsync(string proposalId, CancellationToken cancellationToken = default);
}

public sealed class FieldTaskQuery
{
    public string? FieldId { get; init; }
    public IReadOnlyList<string>? FieldIds { get; init; }
    public int? ResultYear { get; init; }
    public FieldTaskStatus? Status { get; init; }
    public IReadOnlyList<FieldTaskStatus>? Statuses { get; init; }
    public string? AssignedUserId { get; init; }
}

public interface ITaskExecutionRepository : IRepository<TaskExecution, string>
{
    Task<IReadOnlyList<TaskExecution>> GetByTaskIdAsync(string taskId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TaskExecution>> GetByFieldAndYearAsync(
        string fieldId,
        int resultYear,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TaskExecution>> GetByFieldIdAsync(
        string fieldId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TaskExecution>> GetByFieldIdsAsync(
        IReadOnlyList<string> fieldIds,
        CancellationToken cancellationToken = default);
}

public interface IFieldPhenologyObservationRepository : IRepository<FieldPhenologyObservation, string>
{
    Task<IReadOnlyList<FieldPhenologyObservation>> GetByFieldIdAsync(
        string fieldId,
        CancellationToken cancellationToken = default);
}

public interface ITaskWeatherEvaluationRepository : IRepository<TaskWeatherEvaluation, string>
{
}

public interface IOfficialAgriculturalWarningRepository : IRepository<OfficialAgriculturalWarning, string>
{
    Task<IReadOnlyList<OfficialAgriculturalWarning>> GetActiveForFieldAsync(
        string fieldId,
        CancellationToken cancellationToken = default);
}

public interface IFieldWorkProfileRepository : IRepository<FieldWorkProfile, string>
{
    Task<FieldWorkProfile?> GetByFieldIdAsync(
        string fieldId,
        CancellationToken cancellationToken = default);
}
