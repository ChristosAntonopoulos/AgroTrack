using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IApiErrorEventRepository
{
    Task<ApiErrorEvent> CreateAsync(ApiErrorEvent entity, CancellationToken cancellationToken = default);

    Task<ApiErrorEvent?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<ApiErrorEvent> Items, int Total)> GetPageAsync(
        int page,
        int pageSize,
        DateTime? sinceUtc,
        string? pathPrefix,
        int? statusCode,
        bool? unacknowledgedOnly,
        CancellationToken cancellationToken = default);

    Task<int> CountSinceAsync(DateTime sinceUtc, CancellationToken cancellationToken = default);

    Task<int> CountUnacknowledgedAsync(CancellationToken cancellationToken = default);

    Task<ApiErrorEvent> UpdateAsync(ApiErrorEvent entity, CancellationToken cancellationToken = default);
}
