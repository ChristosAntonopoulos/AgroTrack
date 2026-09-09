using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Partners;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/me/contacts")]
public class MeContactsController : BaseApiController
{
    private readonly ISavedContactService _contacts;

    public MeContactsController(ISavedContactService contacts, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _contacts = contacts;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SavedContactDto>>> GetMine(
        [FromQuery] string? fieldId,
        [FromQuery] bool includeUnassigned = false,
        CancellationToken cancellationToken = default)
    {
        var contacts = await _contacts.GetMineAsync(
            UserContext.UserId,
            fieldId,
            includeUnassigned,
            cancellationToken);
        return OkResult(contacts);
    }

    [HttpPost]
    public async Task<ActionResult<SavedContactDto>> Create(
        [FromBody] UpsertSavedContactDto dto,
        CancellationToken cancellationToken)
    {
        var created = await _contacts.CreateAsync(
            UserContext.UserId,
            UserContext.Role,
            dto,
            cancellationToken);
        return OkResult(created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<SavedContactDto>> Update(
        string id,
        [FromBody] UpsertSavedContactDto dto,
        CancellationToken cancellationToken)
    {
        var updated = await _contacts.UpdateAsync(
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
        await _contacts.DeleteAsync(UserContext.UserId, id, cancellationToken);
        return NoContent();
    }
}
