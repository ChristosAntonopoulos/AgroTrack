using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields/{fieldId}/year/{year}/task-plan")]
public class FieldYearTaskPlanController : BaseApiController
{
    private readonly IFieldYearTaskPlanService _plan;

    public FieldYearTaskPlanController(IFieldYearTaskPlanService plan, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _plan = plan;
    }

    [HttpGet]
    public async Task<ActionResult<FieldYearTaskPlanDto>> Get(
        string fieldId,
        int year,
        CancellationToken cancellationToken)
    {
        var language = ResolveLanguage();
        var result = await _plan.GetAsync(
            fieldId,
            year,
            UserContext.UserId,
            UserContext.Role,
            language,
            cancellationToken);
        return OkResult(result);
    }

    private string ResolveLanguage()
    {
        var header = Request.Headers.AcceptLanguage.FirstOrDefault();
        return header?.StartsWith("en", StringComparison.OrdinalIgnoreCase) == true ? "en" : "el";
    }
}

[Authorize]
[Route("api/v1/fields/{fieldId}/task-proposals/evaluate")]
public class FieldTaskProposalEvaluateController : BaseApiController
{
    private readonly ITaskProposalEngine _engine;

    public FieldTaskProposalEvaluateController(ITaskProposalEngine engine, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _engine = engine;
    }

    [HttpPost]
    public async Task<ActionResult<IReadOnlyList<TaskProposalDto>>> Evaluate(
        string fieldId,
        [FromBody] EvaluateTaskProposalsDto? dto,
        CancellationToken cancellationToken)
    {
        var language = Request.Headers.AcceptLanguage.FirstOrDefault()?.StartsWith("en", StringComparison.OrdinalIgnoreCase) == true
            ? "en"
            : "el";
        var body = dto ?? new EvaluateTaskProposalsDto();
        var weather = WeatherSuitabilityExtensions.FromApiString(body.WeatherSuitability);
        var result = await _engine.EvaluateFieldAsync(
            fieldId,
            body.ResultYear,
            UserContext.UserId,
            UserContext.Role,
            language,
            body.HasWeatherData,
            weather,
            cancellationToken);
        return OkResult(result);
    }
}
