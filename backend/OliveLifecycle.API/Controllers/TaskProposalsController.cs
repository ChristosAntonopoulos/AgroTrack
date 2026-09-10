using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/task-proposals")]
public class TaskProposalsController : BaseApiController
{
    private readonly ITaskProposalService _proposals;

    public TaskProposalsController(ITaskProposalService proposals, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _proposals = proposals;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TaskProposalDto>>> List(
        [FromQuery] string? fieldId,
        [FromQuery] int? resultYear,
        CancellationToken cancellationToken)
    {
        var language = ResolveLanguage();
        var items = await _proposals.ListAsync(
            fieldId,
            resultYear,
            UserContext.UserId,
            UserContext.Role,
            language,
            cancellationToken);
        return OkResult(items);
    }

    [HttpPost("{id}/accept")]
    public async Task<ActionResult<TaskProposalDto>> Accept(
        string id,
        [FromBody] AcceptTaskProposalDto? dto,
        CancellationToken cancellationToken)
    {
        var result = await _proposals.AcceptAsync(
            id,
            dto ?? new AcceptTaskProposalDto(),
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    [HttpPost("{id}/snooze")]
    public async Task<ActionResult<TaskProposalDto>> Snooze(
        string id,
        [FromBody] SnoozeTaskProposalDto? dto,
        CancellationToken cancellationToken)
    {
        var result = await _proposals.SnoozeAsync(
            id,
            dto ?? new SnoozeTaskProposalDto(),
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    [HttpPost("{id}/dismiss")]
    public async Task<ActionResult<TaskProposalDto>> Dismiss(
        string id,
        [FromBody] DismissTaskProposalDto? dto,
        CancellationToken cancellationToken)
    {
        var result = await _proposals.DismissAsync(
            id,
            dto ?? new DismissTaskProposalDto(),
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(result);
    }

    private string ResolveLanguage()
    {
        var header = Request.Headers.AcceptLanguage.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(header))
        {
            return "el";
        }

        return header.StartsWith("en", StringComparison.OrdinalIgnoreCase) ? "en" : "el";
    }
}
