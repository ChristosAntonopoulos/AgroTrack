using OliveLifecycle.Application.DTOs.Field;

namespace OliveLifecycle.Application.Services;

public interface IFieldPeopleService
{
    Task<IEnumerable<FieldMembershipDto>> GetPeopleAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<FieldMembershipDto> UpsertMembershipAsync(string fieldId, string actorId, string targetUserId, UpsertFieldMembershipDto dto, CancellationToken cancellationToken = default);
    Task RemoveMembershipAsync(string fieldId, string actorId, string targetUserId, CancellationToken cancellationToken = default);
    Task<FieldInviteDto> CreateInviteAsync(string fieldId, string actorId, CreateFieldInviteDto dto, string? publicAppBaseUrl, CancellationToken cancellationToken = default);
    Task<FieldInviteDto?> GetInviteAsync(string token, CancellationToken cancellationToken = default);
    Task<FieldMembershipDto> AcceptInviteAsync(string token, string userId, CancellationToken cancellationToken = default);
    Task<AdvisorCommentDto> AddAdvisorCommentAsync(string fieldId, string userId, CreateAdvisorCommentDto dto, CancellationToken cancellationToken = default);
    Task<FieldPeopleStatsDto> GetPeopleStatsAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
}
