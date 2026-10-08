using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/task-suggestions")]
public class TaskSuggestionsController : BaseApiController
{
    private readonly ITaskSuggestionService _suggestions;

    public TaskSuggestionsController(ITaskSuggestionService suggestions, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _suggestions = suggestions;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TaskSuggestionDto>>> List(
        [FromQuery] string fieldId,
        [FromQuery] DateTime? date,
        CancellationToken cancellationToken)
    {
        var items = await _suggestions.ListAsync(
            fieldId,
            date,
            UserContext.UserId,
            UserContext.Role,
            ResolveLanguage(),
            cancellationToken);
        return OkResult(items);
    }

    [HttpPost("dismiss")]
    public async Task<ActionResult> Dismiss(
        [FromBody] DismissTaskSuggestionDto dto,
        CancellationToken cancellationToken)
    {
        await _suggestions.DismissAsync(
            dto,
            UserContext.UserId,
            UserContext.Role,
            cancellationToken);
        return NoContent();
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
