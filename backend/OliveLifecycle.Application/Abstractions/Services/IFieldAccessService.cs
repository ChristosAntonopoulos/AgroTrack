namespace OliveLifecycle.Application.Abstractions.Services;

public interface IFieldAccessService
{
    Task<bool> CanUserAccessFieldAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<bool> CanUserModifyFieldAsync(string fieldId, string userId, CancellationToken cancellationToken = default);
}
