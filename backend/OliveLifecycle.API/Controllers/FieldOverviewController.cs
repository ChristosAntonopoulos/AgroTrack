using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields/{fieldId}/overview")]
public class FieldOverviewController : BaseApiController
{
    private readonly IFieldOverviewService _overview;

    public FieldOverviewController(IFieldOverviewService overview, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _overview = overview;
    }

    [HttpGet]
    public async Task<ActionResult<FieldOverviewDto>> Get(
        string fieldId,
        [FromQuery] int? resultYear,
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

        var year = resultYear ?? AgriculturalYear.For(DateTime.UtcNow);
        var dto = await _overview.GetAsync(
            fieldId,
            year,
            UserContext.UserId,
            UserContext.Role,
            language,
            cancellationToken);
        return OkResult(dto);
    }
}
