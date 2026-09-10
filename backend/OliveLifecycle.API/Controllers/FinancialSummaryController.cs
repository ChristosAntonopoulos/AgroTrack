using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/financial-summary")]
public class FinancialSummaryController : BaseApiController
{
    private readonly IFinancialSummaryService _financialSummary;

    public FinancialSummaryController(
        IFinancialSummaryService financialSummary,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _financialSummary = financialSummary;
    }

    [HttpGet("year/{year:int}")]
    public async Task<ActionResult<YearFinancialSummaryDto>> GetYear(
        int year,
        [FromQuery] string? fieldId,
        CancellationToken cancellationToken)
    {
        var summary = await _financialSummary.GetYearSummaryAsync(
            year,
            fieldId,
            UserContext.UserId,
            UserContext.Role,
            RequestLanguage(),
            cancellationToken);
        return OkResult(summary);
    }

    [HttpGet("year/{year:int}/fields/{fieldId}")]
    public async Task<ActionResult<YearFinancialSummaryDto>> GetYearForField(
        int year,
        string fieldId,
        CancellationToken cancellationToken)
    {
        var summary = await _financialSummary.GetYearSummaryAsync(
            year,
            fieldId,
            UserContext.UserId,
            UserContext.Role,
            RequestLanguage(),
            cancellationToken);
        return OkResult(summary);
    }

    [HttpGet("~/api/v1/field-tasks/{taskId}/financial-summary")]
    public async Task<ActionResult<TaskFinancialSummaryDto>> GetTaskSummary(
        string taskId,
        CancellationToken cancellationToken)
    {
        var summary = await _financialSummary.GetTaskSummaryAsync(
            taskId,
            UserContext.UserId,
            UserContext.Role,
            cancellationToken);
        return OkResult(summary);
    }

    [HttpGet("~/api/v1/harvest-records/{harvestId}/financial-summary")]
    public async Task<ActionResult<HarvestFinancialSummaryDto>> GetHarvestSummary(
        string harvestId,
        CancellationToken cancellationToken)
    {
        var summary = await _financialSummary.GetHarvestSummaryAsync(
            harvestId,
            UserContext.UserId,
            UserContext.Role,
            RequestLanguage(),
            cancellationToken);
        return OkResult(summary);
    }

    private string RequestLanguage()
    {
        var query = Request.Query["language"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(query))
        {
            return query;
        }

        var header = Request.Headers.AcceptLanguage.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(header))
        {
            return "el";
        }

        return header.Split(',')[0].Trim();
    }
}
