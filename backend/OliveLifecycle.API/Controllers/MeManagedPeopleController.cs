using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/me")]
public class MeManagedPeopleController : BaseApiController
{
    private readonly IFieldPeopleService _people;
    private readonly IConfiguration _configuration;

    public MeManagedPeopleController(
        IFieldPeopleService people,
        ICurrentUserContext currentUser,
        IConfiguration configuration)
        : base(currentUser)
    {
        _people = people;
        _configuration = configuration;
    }

    /// <summary>
    /// People the current user can manage, aggregated once per account.
    /// Only groves they own are included. Shared groves are omitted.
    /// </summary>
    [HttpGet("managed-people")]
    public async Task<ActionResult<ManagedPeopleDto>> GetManagedPeople(CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["App:PublicWebBaseUrl"]
            ?? _configuration["App:PublicUrl"]
            ?? Request.Headers.Origin.FirstOrDefault();
        var people = await _people.GetManagedPeopleAsync(UserContext.UserId, baseUrl, cancellationToken);
        return OkResult(people);
    }

    /// <summary>
    /// One invitation flow that creates a membership invite on each selected grove.
    /// </summary>
    [HttpPost("field-invites")]
    public async Task<ActionResult<IReadOnlyList<FieldInviteDto>>> CreateInvites(
        [FromBody] CreateMultiFieldInviteDto dto,
        CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["App:PublicWebBaseUrl"]
            ?? _configuration["App:PublicUrl"]
            ?? Request.Headers.Origin.FirstOrDefault();
        var invites = await _people.CreateInvitesAsync(UserContext.UserId, dto, baseUrl, cancellationToken);
        return OkResult(invites);
    }

    /// <summary>Pending field invites for the signed-in user’s email / account.</summary>
    [HttpGet("invites/pending")]
    public async Task<ActionResult<IReadOnlyList<FieldInviteDto>>> GetPendingInvites(CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["App:PublicWebBaseUrl"]
            ?? _configuration["App:PublicUrl"]
            ?? Request.Headers.Origin.FirstOrDefault();
        var invites = await _people.GetPendingInvitesForUserAsync(UserContext.UserId, baseUrl, cancellationToken);
        return OkResult(invites);
    }
}
