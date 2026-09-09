using OliveLifecycle.Application.DTOs.Partners;

namespace OliveLifecycle.Application.Services;

public interface ISavedContactService
{
    Task<IReadOnlyList<SavedContactDto>> GetMineAsync(
        string userId,
        string? fieldId,
        bool includeUnassigned,
        CancellationToken cancellationToken = default);

    Task<SavedContactDto> CreateAsync(
        string userId,
        string userRole,
        UpsertSavedContactDto dto,
        CancellationToken cancellationToken = default);

    Task<SavedContactDto> UpdateAsync(
        string userId,
        string userRole,
        string id,
        UpsertSavedContactDto dto,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(string userId, string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// When an invite is accepted, attach matching private contacts of the inviter to the new user.
    /// </summary>
    Task LinkOnInviteAcceptedAsync(
        string inviterUserId,
        string acceptedUserId,
        string? invitePhone,
        string? inviteEmail,
        CancellationToken cancellationToken = default);
}
