namespace OliveLifecycle.Application.Abstractions.Services;

public interface IFieldAccessService
{
    /// <summary>
    /// True when the user holds an active seat or owns the field (platform admin always).
    /// Does not grant feature data — use <see cref="CanUserAccessFieldModuleAsync"/>.
    /// </summary>
    Task<bool> CanUserAccessFieldAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);

    Task<bool> CanUserModifyFieldAsync(string fieldId, string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Seat module (or field admin / platform admin). Task assignment is never enough.
    /// </summary>
    Task<bool> CanUserAccessFieldModuleAsync(
        string fieldId,
        string userId,
        string userRole,
        string module,
        CancellationToken cancellationToken = default);

    Task<bool> CanUserAccessFieldDocumentsAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);

    Task<bool> CanUserAccessFieldPhotosAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);

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
