using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Chronologio;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/me/chronologio")]
public class MeChronologioController : BaseApiController
{
    private readonly IChronologioService _chronologioService;

    public MeChronologioController(IChronologioService chronologioService, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _chronologioService = chronologioService;
    }

    /// <summary>
    /// Unified agricultural timeline across fields the caller can access (newest first).
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ChronologioEntryDto>>> GetMine(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] string? category = null,
        [FromQuery] string? lifecycleYear = null,
        [FromQuery] string? cropCycleId = null,
        [FromQuery] string? fieldId = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        CancellationToken cancellationToken = default)
    {
        var entries = await _chronologioService.GetForUserAsync(
            UserContext.UserId,
            UserContext.Role,
            new ChronologioQuery
            {
                From = from,
                To = to,
                Category = category,
                LifecycleYear = lifecycleYear,
                CropCycleId = cropCycleId,
                FieldId = fieldId,
                Limit = limit,
                Offset = offset
            },
            cancellationToken);

        return OkResult(entries);
    }

    [HttpGet("summaries/years")]
    public async Task<ActionResult<IReadOnlyList<ChronologioPeriodSummaryDto>>> GetYearSummaries(
        [FromQuery] string axis = ChronologioAxis.Calendar,
        [FromQuery] string? category = null,
        [FromQuery] string? fieldId = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var summaries = await _chronologioService.GetYearSummariesForUserAsync(
            UserContext.UserId,
            UserContext.Role,
            new ChronologioSummaryQuery
            {
                Axis = axis,
                Category = category,
                FieldId = fieldId,
                From = from,
                To = to
            },
            cancellationToken);

        return OkResult(summaries);
    }

    [HttpGet("summaries/months")]
    public async Task<ActionResult<IReadOnlyList<ChronologioMonthSummaryDto>>> GetMonthSummaries(
        [FromQuery] string axis = ChronologioAxis.Calendar,
        [FromQuery] int? year = null,
        [FromQuery] int? season = null,
        [FromQuery] string? category = null,
        [FromQuery] string? fieldId = null,
        CancellationToken cancellationToken = default)
    {
        var periodYear = ChronologioAxis.ResolvePeriodYear(axis, year, season);
        var summaries = await _chronologioService.GetMonthSummariesForUserAsync(
            UserContext.UserId,
            UserContext.Role,
            new ChronologioSummaryQuery
            {
                Axis = axis,
                Category = category,
                FieldId = fieldId,
                PeriodYear = periodYear
            },
            cancellationToken);

        return OkResult(summaries);
    }
}
