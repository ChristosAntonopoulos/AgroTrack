using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IProcessedBillingEventRepository
{
    Task<bool> ExistsAsync(string providerEventId, CancellationToken cancellationToken = default);
    Task<ProcessedBillingEvent> CreateAsync(ProcessedBillingEvent entity, CancellationToken cancellationToken = default);
}
