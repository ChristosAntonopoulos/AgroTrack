using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Services;

public sealed class FinancialAccess
{
    public bool IsOwner { get; init; }
    public bool IsProfessional { get; init; }
    public bool OwnExpensesOnly { get; init; }
    public IReadOnlySet<string> Capabilities { get; init; } = new HashSet<string>();

    public bool Can(string capability) => Capabilities.Contains(capability);

    public static FinancialAccess None { get; } = new()
    {
        IsProfessional = true,
        Capabilities = new HashSet<string>()
    };
}

public interface IFinancialAuthorizationService
{
    Task<FinancialAccess> ResolveForFieldAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<FinancialAccess> ResolveForUnassignedAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<FinancialAccess> ResolveForTransactionAsync(
        FinancialTransaction transaction,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    bool CanViewTransaction(FinancialAccess access, FinancialTransaction transaction, string userId);
}

public interface IFinancialTransactionService
{
    Task<FinancialTransactionDto> CreateAsync(
        CreateFinancialTransactionDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<FinancialTransactionDto?> GetByIdAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<FinancialTransactionListDto> ListAsync(
        FinancialTransactionListQuery query,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<FinancialTransactionDto> UpdateAsync(
        string id,
        UpdateFinancialTransactionDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<FinancialTransactionDto> PostAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<FinancialTransactionDto> VoidAsync(
        string id,
        VoidFinancialTransactionDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task DeleteDraftAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);
}

public interface IFinancialSummaryService
{
    Task<YearFinancialSummaryDto> GetYearSummaryAsync(
        int year,
        string? fieldId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<TaskFinancialSummaryDto> GetTaskSummaryAsync(
        string taskId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<HarvestFinancialSummaryDto> GetHarvestSummaryAsync(
        string harvestId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);
}
