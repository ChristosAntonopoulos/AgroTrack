using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.OwnerPartner;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Route("api/v1/partner-invites")]
public class OwnerPartnerInvitesController : BaseApiController
{
    private readonly IOwnerPartnerService _partners;
    private readonly IConfiguration _configuration;

    public OwnerPartnerInvitesController(
        IOwnerPartnerService partners,
        ICurrentUserContext currentUser,
        IConfiguration configuration)
        : base(currentUser)
    {
        _partners = partners;
        _configuration = configuration;
    }

    [AllowAnonymous]
    [HttpGet("{token}")]
    public async Task<ActionResult<OwnerPartnerInviteShareDto>> GetInvite(string token, CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["App:PublicUrl"] ?? Request.Headers.Origin.FirstOrDefault();
        var invite = await _partners.GetInviteAsync(token, baseUrl, cancellationToken);
        if (invite == null)
        {
            return NotFound();
        }

        return OkResult(invite);
    }

    [Authorize]
    [HttpPost("{token}/accept")]
    public async Task<ActionResult<OwnerPartnerLinkDto>> AcceptInvite(string token, CancellationToken cancellationToken)
    {
        var link = await _partners.AcceptInviteAsync(token, UserContext.UserId, cancellationToken);
        return OkResult(link);
    }
}
