using OliveLifecycle.Application.DTOs.Family;

namespace OliveLifecycle.Application.Abstractions.Services;

public interface IFieldAccessService
{
    Task<bool> CanUserAccessFieldAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<bool> CanUserModifyFieldAsync(string fieldId, string userId, CancellationToken cancellationToken = default);
    Task<bool> CanUserAccessFieldDocumentsAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<bool> HasCapacityAsync(string fieldId, string userId, string capacity, CancellationToken cancellationToken = default);

    /// <summary>
    /// Active family membership for this field's owner, if any.
    /// </summary>
    Task<FamilyAccessSnapshot?> GetFamilyAccessForFieldAsync(
        string fieldId,
        string userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Family member may use a module on an owner's field (read).
    /// </summary>
    Task<bool> CanFamilyAccessModuleAsync(
        string fieldId,
        string userId,
        string module,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Family member may write within a module (help for task status; work for create/money/docs).
    /// </summary>
    Task<bool> CanFamilyWriteModuleAsync(
        string fieldId,
        string userId,
        string module,
        bool requireCreateLevel = false,
        CancellationToken cancellationToken = default);
}
