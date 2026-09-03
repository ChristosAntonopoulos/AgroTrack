using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields/{fieldId}/people")]
public class FieldPeopleController : BaseApiController
{
    private readonly IFieldPeopleService _peopleService;
    private readonly IConfiguration _configuration;

    public FieldPeopleController(
        IFieldPeopleService peopleService,
        ICurrentUserContext currentUser,
        IConfiguration configuration)
        : base(currentUser)
    {
        _peopleService = peopleService;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FieldMembershipDto>>> GetPeople(string fieldId, CancellationToken cancellationToken)
    {
        var people = await _peopleService.GetPeopleAsync(fieldId, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(people);
    }

    [HttpPut("{userId}")]
    public async Task<ActionResult<FieldMembershipDto>> UpsertMembership(
        string fieldId,
        string userId,
        [FromBody] UpsertFieldMembershipDto dto,
        CancellationToken cancellationToken)
    {
        var membership = await _peopleService.UpsertMembershipAsync(fieldId, UserContext.UserId, userId, dto, cancellationToken);
        return OkResult(membership);
    }

    [HttpDelete("{userId}")]
    public async Task<IActionResult> RemoveMembership(string fieldId, string userId, CancellationToken cancellationToken)
    {
        await _peopleService.RemoveMembershipAsync(fieldId, UserContext.UserId, userId, cancellationToken);
        return NoContent();
    }

    [HttpPost("invites")]
    public async Task<ActionResult<FieldInviteDto>> CreateInvite(
        string fieldId,
        [FromBody] CreateFieldInviteDto dto,
        CancellationToken cancellationToken)
    {
        var baseUrl = _configuration["App:PublicUrl"] ?? Request.Headers.Origin.FirstOrDefault();
        var invite = await _peopleService.CreateInviteAsync(fieldId, UserContext.UserId, dto, baseUrl, cancellationToken);
        return OkResult(invite);
    }

    [HttpGet("stats")]
    public async Task<ActionResult<FieldPeopleStatsDto>> GetStats(string fieldId, CancellationToken cancellationToken)
    {
        var stats = await _peopleService.GetPeopleStatsAsync(fieldId, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(stats);
    }

    [HttpPost("advisor-comments")]
    public async Task<ActionResult<AdvisorCommentDto>> AddComment(
        string fieldId,
        [FromBody] CreateAdvisorCommentDto dto,
        CancellationToken cancellationToken)
    {
        var comment = await _peopleService.AddAdvisorCommentAsync(fieldId, UserContext.UserId, dto, cancellationToken);
        return OkResult(comment);
    }
}
