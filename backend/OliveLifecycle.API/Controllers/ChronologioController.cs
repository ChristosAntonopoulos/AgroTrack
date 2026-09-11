using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Chronologio;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields/{fieldId}/chronologio")]
public class ChronologioController : BaseApiController
{
    private readonly IChronologioService _chronologioService;

    public ChronologioController(IChronologioService chronologioService, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _chronologioService = chronologioService;
    }

    /// <summary>
    /// Unified agricultural timeline for a single field (newest first).
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ChronologioEntryDto>>> GetForField(
        string fieldId,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] string? category = null,
        [FromQuery] string? lifecycleYear = null,
        [FromQuery] string? cropCycleId = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        CancellationToken cancellationToken = default)
    {
        var entries = await _chronologioService.GetForFieldAsync(
            fieldId,
            UserContext.UserId,
            UserContext.Role,
            new ChronologioQuery
            {
                From = from,
                To = to,
                Category = category,
                LifecycleYear = lifecycleYear,
                CropCycleId = cropCycleId,
                Limit = limit,
                Offset = offset
            },
            cancellationToken);

        return OkResult(entries);
    }

    /// <summary>
    /// Year or cultivation-season rollups for Living Timeline (Χρόνια).
    /// </summary>
    [HttpGet("summaries/years")]
    public async Task<ActionResult<IReadOnlyList<ChronologioPeriodSummaryDto>>> GetYearSummaries(
        string fieldId,
        [FromQuery] string axis = ChronologioAxis.Calendar,
        [FromQuery] string? category = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var summaries = await _chronologioService.GetYearSummariesForFieldAsync(
            fieldId,
            UserContext.UserId,
            UserContext.Role,
            new ChronologioSummaryQuery
            {
                Axis = axis,
                Category = category,
                From = from,
                To = to
            },
            cancellationToken);

        return OkResult(summaries);
    }

    /// <summary>
    /// Month rollups for one calendar year or cultivation season (Έτος).
    /// Use year= for calendar, season= for season start year (1 Sep → 31 Aug).
    /// </summary>
    [HttpGet("summaries/months")]
    public async Task<ActionResult<IReadOnlyList<ChronologioMonthSummaryDto>>> GetMonthSummaries(
        string fieldId,
        [FromQuery] string axis = ChronologioAxis.Calendar,
        [FromQuery] int? year = null,
        [FromQuery] int? season = null,
        [FromQuery] string? category = null,
        CancellationToken cancellationToken = default)
    {
        var periodYear = ChronologioAxis.ResolvePeriodYear(axis, year, season);
        var summaries = await _chronologioService.GetMonthSummariesForFieldAsync(
            fieldId,
            UserContext.UserId,
            UserContext.Role,
            new ChronologioSummaryQuery
            {
                Axis = axis,
                Category = category,
                PeriodYear = periodYear
            },
            cancellationToken);

        return OkResult(summaries);
    }
}
