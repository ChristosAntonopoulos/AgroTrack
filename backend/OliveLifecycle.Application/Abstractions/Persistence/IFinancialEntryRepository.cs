using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IFinancialEntryRepository : IRepository<FinancialEntry, string>
{
    Task<IEnumerable<FinancialEntry>> GetByFieldIdAsync(
        string fieldId,
        bool includeVoided = false,
        int limit = 200,
        CancellationToken cancellationToken = default);

    Task<IEnumerable<FinancialEntry>> GetByFieldIdsAsync(
        IEnumerable<string> fieldIds,
        CancellationToken cancellationToken = default);
}
