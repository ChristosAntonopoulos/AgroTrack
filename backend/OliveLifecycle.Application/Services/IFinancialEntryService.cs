using OliveLifecycle.Application.DTOs.Financial;

namespace OliveLifecycle.Application.Services;

public interface IFinancialEntryService
{
    Task<FinancialEntryDto> CreateAsync(CreateFinancialEntryDto dto, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<FinancialEntryDto?> GetByIdAsync(string id, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<IEnumerable<FinancialEntryDto>> GetByFieldIdAsync(string fieldId, string userId, string userRole, bool includeVoided = false, CancellationToken cancellationToken = default);
    Task<FieldFinancialSummaryDto> GetFieldSummaryAsync(string fieldId, string userId, string userRole, string? lifecycleYear = null, CancellationToken cancellationToken = default);
    Task<FinancialOverviewDto> GetOverviewAsync(string userId, string userRole, CancellationToken cancellationToken = default);
    Task<FinancialEntryDto> UpdateAsync(string id, UpdateFinancialEntryDto dto, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<FinancialEntryDto> VoidAsync(string id, VoidFinancialEntryDto dto, string userId, string userRole, CancellationToken cancellationToken = default);
}
