using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IFieldInviteRepository
{
    Task<FieldInvite> CreateAsync(FieldInvite invite, CancellationToken cancellationToken = default);
    Task<FieldInvite?> GetByTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<FieldInvite> UpdateAsync(FieldInvite invite, CancellationToken cancellationToken = default);
    Task<IEnumerable<FieldInvite>> GetByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default);
    Task<IEnumerable<FieldInvite>> GetByInvitedByAsync(string invitedBy, CancellationToken cancellationToken = default);
}
