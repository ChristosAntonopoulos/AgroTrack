using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Family;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Route("api/v1/family-invites")]
public class FamilyInvitesController : BaseApiController
{
    private readonly IFamilyService _family;
    private readonly IConfiguration _configuration;

    public FamilyInvitesController(
        IFamilyService family,
        ICurrentUserContext currentUser,
        IConfiguration configuration)
        : base(currentUser)
    {
        _family = family;
        _configuration = configuration;
    }

    [AllowAnonymous]
    [HttpGet("{token}")]
    public async Task<ActionResult<FamilyInviteShareDto>> GetInvite(string token, CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["App:PublicUrl"] ?? Request.Headers.Origin.FirstOrDefault();
        var invite = await _family.GetInviteAsync(token, baseUrl, cancellationToken);
        if (invite == null)
        {
            return NotFound();
        }

        return OkResult(invite);
    }

    [Authorize]
    [HttpPost("{token}/accept")]
    public async Task<ActionResult<FamilyMemberDto>> AcceptInvite(string token, CancellationToken cancellationToken)
    {
        var member = await _family.AcceptInviteAsync(token, UserContext.UserId, cancellationToken);
        return OkResult(member);
    }
}
