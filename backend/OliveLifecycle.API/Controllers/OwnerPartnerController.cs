using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.OwnerPartner;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/me/partner")]
public class OwnerPartnerController : BaseApiController
{
    private readonly IOwnerPartnerService _partners;
    private readonly IConfiguration _configuration;

    public OwnerPartnerController(
        IOwnerPartnerService partners,
        ICurrentUserContext currentUser,
        IConfiguration configuration)
        : base(currentUser)
    {
        _partners = partners;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<ActionResult<OwnerPartnerSeatDto>> GetMine(CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["App:PublicUrl"] ?? Request.Headers.Origin.FirstOrDefault();
        var seat = await _partners.GetMineAsync(UserContext.UserId, baseUrl, cancellationToken);
        return OkResult(seat);
    }

    /// <summary>
    /// Active owner-partner seats for the current user (as someone else's work partner).
    /// </summary>
    [HttpGet("memberships")]
    public async Task<ActionResult<IReadOnlyList<OwnerPartnerAccessSnapshot>>> GetMyMemberships(
        CancellationToken cancellationToken)
    {
        var memberships = await _partners.GetMyMembershipAccessAsync(UserContext.UserId, cancellationToken);
        return OkResult(memberships);
    }

    [HttpPost("invites")]
    public async Task<ActionResult<OwnerPartnerInviteShareDto>> CreateInvite(
        [FromBody] CreateOwnerPartnerInviteDto dto,
        CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["App:PublicUrl"] ?? Request.Headers.Origin.FirstOrDefault();
        var invite = await _partners.CreateInviteAsync(UserContext.UserId, dto, baseUrl, cancellationToken);
        return OkResult(invite);
    }

    [HttpPatch("links/{id}")]
    public async Task<ActionResult<OwnerPartnerLinkDto>> UpdateLink(
        string id,
        [FromBody] UpdateOwnerPartnerLinkDto dto,
        CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["App:PublicUrl"] ?? Request.Headers.Origin.FirstOrDefault();
        var link = await _partners.UpdateLinkAsync(UserContext.UserId, id, dto, baseUrl, cancellationToken);
        return OkResult(link);
    }

    [HttpDelete("links/{id}")]
    public async Task<IActionResult> RevokeLink(string id, CancellationToken cancellationToken)
    {
        await _partners.RevokeLinkAsync(UserContext.UserId, id, cancellationToken);
        return NoContent();
    }
}
