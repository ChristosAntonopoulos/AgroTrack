using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Family;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/me/family")]
public class FamilyController : BaseApiController
{
    private readonly IFamilyService _family;
    private readonly IConfiguration _configuration;

    public FamilyController(
        IFamilyService family,
        ICurrentUserContext currentUser,
        IConfiguration configuration)
        : base(currentUser)
    {
        _family = family;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<ActionResult<FamilyCircleDto>> GetMine(CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["App:PublicUrl"] ?? Request.Headers.Origin.FirstOrDefault();
        var circle = await _family.GetMineAsync(UserContext.UserId, baseUrl, cancellationToken);
        return OkResult(circle);
    }

    /// <summary>
    /// Active family memberships for the current user (as a member of someone else's circle).
    /// </summary>
    [HttpGet("memberships")]
    public async Task<ActionResult<IReadOnlyList<FamilyAccessSnapshot>>> GetMyMemberships(
        CancellationToken cancellationToken)
    {
        var memberships = await _family.GetMyMembershipAccessAsync(UserContext.UserId, cancellationToken);
        return OkResult(memberships);
    }

    [HttpPost("invites")]
    public async Task<ActionResult<FamilyInviteShareDto>> CreateInvite(
        [FromBody] CreateFamilyInviteDto dto,
        CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["App:PublicUrl"] ?? Request.Headers.Origin.FirstOrDefault();
        var invite = await _family.CreateInviteAsync(UserContext.UserId, dto, baseUrl, cancellationToken);
        return OkResult(invite);
    }

    [HttpPatch("members/{id}")]
    public async Task<ActionResult<FamilyMemberDto>> UpdateMember(
        string id,
        [FromBody] UpdateFamilyMemberDto dto,
        CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["App:PublicUrl"] ?? Request.Headers.Origin.FirstOrDefault();
        var member = await _family.UpdateMemberAsync(UserContext.UserId, id, dto, baseUrl, cancellationToken);
        return OkResult(member);
    }

    [HttpDelete("members/{id}")]
    public async Task<IActionResult> RevokeMember(string id, CancellationToken cancellationToken)
    {
        await _family.RevokeMemberAsync(UserContext.UserId, id, cancellationToken);
        return NoContent();
    }
}
