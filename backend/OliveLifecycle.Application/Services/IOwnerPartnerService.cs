using OliveLifecycle.Application.DTOs.OwnerPartner;

namespace OliveLifecycle.Application.Services;

public interface IOwnerPartnerService
{
    Task<OwnerPartnerSeatDto> GetMineAsync(string ownerUserId, string? publicAppBaseUrl = null, CancellationToken cancellationToken = default);

    Task<OwnerPartnerInviteShareDto> CreateInviteAsync(
        string ownerUserId,
        CreateOwnerPartnerInviteDto dto,
        string? publicAppBaseUrl,
        CancellationToken cancellationToken = default);

    Task<OwnerPartnerLinkDto> UpdateLinkAsync(
        string ownerUserId,
        string linkId,
        UpdateOwnerPartnerLinkDto dto,
        string? publicAppBaseUrl = null,
        CancellationToken cancellationToken = default);

    Task RevokeLinkAsync(string ownerUserId, string linkId, CancellationToken cancellationToken = default);

    Task<OwnerPartnerInviteShareDto?> GetInviteAsync(string token, string? publicAppBaseUrl = null, CancellationToken cancellationToken = default);

    Task<OwnerPartnerLinkDto> AcceptInviteAsync(string token, string userId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OwnerPartnerAccessSnapshot>> GetActiveAccessesByLinkedUserAsync(
        string linkedUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OwnerPartnerAccessSnapshot>> GetMyMembershipAccessAsync(
        string userId,
        CancellationToken cancellationToken = default);
}
