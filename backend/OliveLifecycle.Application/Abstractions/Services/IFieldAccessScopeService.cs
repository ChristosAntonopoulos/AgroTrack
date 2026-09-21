using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Services;

public interface IFieldAccessScopeService
{
    Task<IReadOnlyList<Field>> ResolveAccessibleFieldsAsync(
        string userId,
        string userRole,
        string? requiredModule = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> ResolveAccessibleFieldIdsAsync(
        string userId,
        string userRole,
        string? requiredModule = null,
        CancellationToken cancellationToken = default);
}
