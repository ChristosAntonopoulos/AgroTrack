using OliveLifecycle.Application.DTOs.Notes;

namespace OliveLifecycle.Application.Services;

public interface INoteService
{
    Task<IReadOnlyList<NoteDto>> GetMineAsync(
        string userId,
        string? fieldId = null,
        int? limit = null,
        CancellationToken cancellationToken = default);

    Task<NoteDto> CreateAsync(
        string userId,
        string userRole,
        UpsertNoteDto dto,
        CancellationToken cancellationToken = default);

    Task<NoteDto> UpdateAsync(
        string userId,
        string userRole,
        string id,
        UpsertNoteDto dto,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(string userId, string id, CancellationToken cancellationToken = default);
}
