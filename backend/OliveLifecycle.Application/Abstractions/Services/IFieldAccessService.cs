namespace OliveLifecycle.Application.Abstractions.Services;

public interface IFieldAccessService
{
    Task<bool> CanUserAccessFieldAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<bool> CanUserModifyFieldAsync(string fieldId, string userId, CancellationToken cancellationToken = default);
    Task<bool> CanUserAccessFieldDocumentsAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);

    /// <summary>
    /// Collaborator may use a module on a field (read). Admin always true.
    /// </summary>
    Task<bool> CanFamilyAccessModuleAsync(
        string fieldId,
        string userId,
        string module,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Collaborator may write within a module (help for task status; work for create/money/docs).
    /// </summary>
    Task<bool> CanFamilyWriteModuleAsync(
        string fieldId,
        string userId,
        string module,
        bool requireCreateLevel = false,
        CancellationToken cancellationToken = default);
}
