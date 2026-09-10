using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields/{fieldId}/task-proposals")]
public class FieldTaskProposalsController : BaseApiController
{
    private readonly ITaskProposalService _proposals;

    public FieldTaskProposalsController(ITaskProposalService proposals, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _proposals = proposals;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TaskProposalDto>>> List(
        string fieldId,
        [FromQuery] int? resultYear,
        CancellationToken cancellationToken)
    {
        var language = Request.Headers.AcceptLanguage.FirstOrDefault()?.StartsWith("en", StringComparison.OrdinalIgnoreCase) == true
            ? "en"
            : "el";
        var items = await _proposals.ListAsync(
            fieldId,
            resultYear,
            UserContext.UserId,
            UserContext.Role,
            language,
            cancellationToken);
        return OkResult(items);
    }
}
