using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/reports")]
public class ReportsController : BaseApiController
{
    private readonly IReportsService _reportsService;

    public ReportsController(IReportsService reportsService, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _reportsService = reportsService;
    }

    [HttpGet("field-summaries")]
    [Authorize(Policy = PolicyNames.RequireFieldOwner)]
    public async Task<IActionResult> GetFieldSummaries(
        [FromQuery] string? lifecycleYear,
        [FromQuery] string? season,
        CancellationToken cancellationToken)
    {
        var summaries = await _reportsService.GetFieldSummariesAsync(
            UserContext.UserId,
            UserContext.Role,
            lifecycleYear,
            season,
            cancellationToken);
        return Ok(summaries);
    }

    [HttpGet("harvest-records")]
    [Authorize(Policy = PolicyNames.RequireFieldOwner)]
    public async Task<IActionResult> GetHarvestRecords(
        [FromQuery] string? lifecycleYear,
        [FromQuery] string? season,
        CancellationToken cancellationToken)
    {
        var records = await _reportsService.GetHarvestRecordsAsync(
            UserContext.UserId,
            UserContext.Role,
            lifecycleYear,
            season,
            cancellationToken);
        return Ok(records);
    }

    [HttpGet("profit-loss")]
    [Authorize(Policy = PolicyNames.RequireFieldOwner)]
    public async Task<IActionResult> GetProfitLoss(
        [FromQuery] string? lifecycleYear,
        [FromQuery] string? season,
        CancellationToken cancellationToken)
    {
        var report = await _reportsService.GetProfitLossAsync(
            UserContext.UserId,
            UserContext.Role,
            lifecycleYear,
            season,
            cancellationToken);
        return Ok(report);
    }

    [HttpGet("weather-month")]
    [Authorize(Policy = PolicyNames.RequireFieldOwner)]
    public async Task<IActionResult> GetMonthlyWeather(
        [FromQuery] string? season,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var report = await _reportsService.GetMonthlyWeatherAsync(
            UserContext.UserId,
            UserContext.Role,
            season,
            month,
            cancellationToken);
        return Ok(report);
    }

    [HttpGet("weather-year")]
    [Authorize(Policy = PolicyNames.RequireFieldOwner)]
    public async Task<IActionResult> GetYearlyWeather(
        [FromQuery] string? season,
        CancellationToken cancellationToken)
    {
        var report = await _reportsService.GetYearlyWeatherAsync(
            UserContext.UserId,
            UserContext.Role,
            season,
            cancellationToken);
        return Ok(report);
    }
}
