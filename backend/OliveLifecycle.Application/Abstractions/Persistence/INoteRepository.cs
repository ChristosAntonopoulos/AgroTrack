using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface INoteRepository : IRepository<Note, string>
{
    Task<IReadOnlyList<Note>> GetByOwnerUserIdAsync(
        string ownerUserId,
        string? fieldId = null,
        int? limit = null,
        CancellationToken cancellationToken = default);
}
