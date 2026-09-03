using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Route("api/v1/invites")]
public class InvitesController : BaseApiController
{
    private readonly IFieldPeopleService _peopleService;

    public InvitesController(IFieldPeopleService peopleService, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _peopleService = peopleService;
    }

    [AllowAnonymous]
    [HttpGet("{token}")]
    public async Task<ActionResult<FieldInviteDto>> GetInvite(string token, CancellationToken cancellationToken)
    {
        var invite = await _peopleService.GetInviteAsync(token, cancellationToken);
        if (invite == null)
        {
            return NotFound();
        }

        return OkResult(invite);
    }

    [Authorize]
    [HttpPost("{token}/accept")]
    public async Task<ActionResult<FieldMembershipDto>> AcceptInvite(string token, CancellationToken cancellationToken)
    {
        var membership = await _peopleService.AcceptInviteAsync(token, UserContext.UserId, cancellationToken);
        return OkResult(membership);
    }
}
