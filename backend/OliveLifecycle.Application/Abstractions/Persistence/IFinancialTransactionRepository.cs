using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public sealed class FinancialTransactionQuery
{
    public string? OwnerUserId { get; init; }
    public int? ResultYear { get; init; }
    public string? FieldId { get; init; }
    public IReadOnlyList<string>? FieldIds { get; init; }
    public bool IncludeUnassigned { get; init; }
    public FinancialTransactionType? Type { get; init; }
    public FinancialTransactionStatus? Status { get; init; }
    public FinancialTransactionCategory? Category { get; init; }
    public int? Month { get; init; }
    public string? RelatedTaskId { get; init; }
    public string? RelatedHarvestId { get; init; }
    public string? CreatedByUserId { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 50;
}

public sealed class FinancialTransactionPage
{
    public IReadOnlyList<FinancialTransaction> Items { get; init; } = [];
    public int TotalCount { get; init; }
}

public interface IFinancialTransactionRepository : IRepository<FinancialTransaction, string>
{
    Task<FinancialTransaction?> GetByIdempotencyKeyAsync(
        string ownerUserId,
        string idempotencyKey,
        CancellationToken cancellationToken = default);

    Task<FinancialTransactionPage> QueryAsync(
        FinancialTransactionQuery query,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FinancialTransaction>> GetForYearAsync(
        string ownerUserId,
        int resultYear,
        IReadOnlyList<string> permittedFieldIds,
        string? fieldId,
        bool includeUnassigned,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FinancialTransaction>> GetByRelatedTaskIdAsync(
        string taskId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FinancialTransaction>> GetByRelatedHarvestIdAsync(
        string harvestId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FinancialTransaction>> GetPostedByFieldIdsAsync(
        IReadOnlyList<string> fieldIds,
        CancellationToken cancellationToken = default);
}
