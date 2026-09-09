using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Notes;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/me/notes")]
public class MeNotesController : BaseApiController
{
    private readonly INoteService _notes;

    public MeNotesController(INoteService notes, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _notes = notes;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NoteDto>>> GetMine(
        [FromQuery] string? fieldId,
        [FromQuery] int? limit,
        CancellationToken cancellationToken = default)
    {
        var notes = await _notes.GetMineAsync(
            UserContext.UserId,
            fieldId,
            limit,
            cancellationToken);
        return OkResult(notes);
    }

    [HttpPost]
    public async Task<ActionResult<NoteDto>> Create(
        [FromBody] UpsertNoteDto dto,
        CancellationToken cancellationToken)
    {
        var created = await _notes.CreateAsync(
            UserContext.UserId,
            UserContext.Role,
            dto,
            cancellationToken);
        return OkResult(created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<NoteDto>> Update(
        string id,
        [FromBody] UpsertNoteDto dto,
        CancellationToken cancellationToken)
    {
        var updated = await _notes.UpdateAsync(
            UserContext.UserId,
            UserContext.Role,
            id,
            dto,
            cancellationToken);
        return OkResult(updated);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        await _notes.DeleteAsync(UserContext.UserId, id, cancellationToken);
        return NoContent();
    }
}
