using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Services;

public interface IFieldPeopleService
{
    Task<IEnumerable<FieldMembershipDto>> GetPeopleAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<FieldMembershipDto> UpsertMembershipAsync(string fieldId, string actorId, string targetUserId, UpsertFieldMembershipDto dto, CancellationToken cancellationToken = default);
    Task RemoveMembershipAsync(string fieldId, string actorId, string targetUserId, CancellationToken cancellationToken = default);
    Task<FieldMembershipDto> UpdatePersonAsync(string fieldId, string actorId, string targetUserId, UpdateFieldPersonDto dto, CancellationToken cancellationToken = default);
    Task RevokePersonAsync(string fieldId, string actorId, string targetUserId, CancellationToken cancellationToken = default);
    Task<FieldInviteDto> CreateInviteAsync(string fieldId, string actorId, CreateFieldInviteDto dto, string? publicAppBaseUrl, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FieldInviteDto>> CreateInvitesAsync(string actorId, CreateMultiFieldInviteDto dto, string? publicAppBaseUrl, CancellationToken cancellationToken = default);
    Task<ManagedPeopleDto> GetManagedPeopleAsync(string userId, string? publicAppBaseUrl, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FieldInviteDto>> GetInvitesAsync(string fieldId, string actorId, string? publicAppBaseUrl, CancellationToken cancellationToken = default);
    Task<FieldInviteDto> ResendInviteAsync(string fieldId, string actorId, string inviteId, string? publicAppBaseUrl, CancellationToken cancellationToken = default);
    Task<FieldInviteDto?> GetInviteAsync(string tokenOrCode, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FieldInviteDto>> GetPendingInvitesForUserAsync(
        string userId,
        string? publicAppBaseUrl,
        CancellationToken cancellationToken = default);
    Task<FieldMembershipDto> AcceptInviteAsync(string tokenOrCode, string userId, CancellationToken cancellationToken = default);
    Task<AdvisorCommentDto> AddAdvisorCommentAsync(string fieldId, string userId, CreateAdvisorCommentDto dto, CancellationToken cancellationToken = default);
    Task<FieldPeopleStatsDto> GetPeopleStatsAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FieldAccessSnapshotDto>> GetMyFieldAccessAsync(string userId, CancellationToken cancellationToken = default);
    Task EnsureAdminSeatOnCreateAsync(Field field, string adminUserId, CancellationToken cancellationToken = default);

    /// <summary>Transfer billing ownership (Admin seat + OwnerId) to another user. Enforces plan limits.</summary>
    Task<FieldMembershipDto> TransferOwnershipAsync(
        string fieldId,
        string actorUserId,
        string newOwnerUserId,
        CancellationToken cancellationToken = default);
}
