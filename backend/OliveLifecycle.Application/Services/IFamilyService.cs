using OliveLifecycle.Application.DTOs.Family;

namespace OliveLifecycle.Application.Services;

public interface IFamilyService
{
    Task<FamilyCircleDto> GetMineAsync(string ownerUserId, string? publicAppBaseUrl = null, CancellationToken cancellationToken = default);

    Task<FamilyInviteShareDto> CreateInviteAsync(
        string ownerUserId,
        CreateFamilyInviteDto dto,
        string? publicAppBaseUrl,
        CancellationToken cancellationToken = default);

    Task<FamilyMemberDto> UpdateMemberAsync(
        string ownerUserId,
        string memberId,
        UpdateFamilyMemberDto dto,
        string? publicAppBaseUrl = null,
        CancellationToken cancellationToken = default);

    Task RevokeMemberAsync(string ownerUserId, string memberId, CancellationToken cancellationToken = default);

    Task<FamilyInviteShareDto?> GetInviteAsync(string token, string? publicAppBaseUrl = null, CancellationToken cancellationToken = default);

    Task<FamilyMemberDto> AcceptInviteAsync(string token, string userId, CancellationToken cancellationToken = default);

    Task<FamilyAccessSnapshot?> GetActiveAccessByLinkedUserAsync(
        string linkedUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FamilyAccessSnapshot>> GetActiveAccessesByLinkedUserAsync(
        string linkedUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FamilyAccessSnapshot>> GetMyMembershipAccessAsync(
        string userId,
        CancellationToken cancellationToken = default);
}
