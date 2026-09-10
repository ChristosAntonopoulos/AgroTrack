using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields/{fieldId}/year/{year}/summary")]
public class FieldYearSummaryController : BaseApiController
{
    private readonly IFieldYearSummaryService _summary;

    public FieldYearSummaryController(
        IFieldYearSummaryService summary,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _summary = summary;
    }

    [HttpGet]
    public async Task<ActionResult<FieldYearSummaryDto>> Get(
        string fieldId,
        int year,
        CancellationToken cancellationToken)
    {
        var language = Request.Headers.AcceptLanguage.ToString();
        if (string.IsNullOrWhiteSpace(language))
        {
            language = "el";
        }
        else
        {
            language = language.Split(',').FirstOrDefault()?.Trim() ?? "el";
            if (language.StartsWith("en", StringComparison.OrdinalIgnoreCase))
            {
                language = "en";
            }
            else
            {
                language = "el";
            }
        }

        var result = await _summary.GetAsync(
            fieldId,
            year,
            UserContext.UserId,
            UserContext.Role,
            language,
            cancellationToken);
        return OkResult(result);
    }
}
