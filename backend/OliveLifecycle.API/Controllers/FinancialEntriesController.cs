using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/financial-entries")]
public class FinancialEntriesController : BaseApiController
{
    private readonly IFinancialEntryService _financialEntryService;

    public FinancialEntriesController(IFinancialEntryService financialEntryService, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _financialEntryService = financialEntryService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FinancialEntryDto>>> GetByField(
        [FromQuery] string fieldId,
        [FromQuery] bool includeVoided = false,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fieldId))
        {
            return BadRequest("fieldId is required.");
        }

        var entries = await _financialEntryService.GetByFieldIdAsync(
            fieldId,
            UserContext.UserId,
            UserContext.Role,
            includeVoided,
            cancellationToken);
        return OkResult(entries);
    }

    [HttpGet("summary")]
    public async Task<ActionResult<FieldFinancialSummaryDto>> GetSummary(
        [FromQuery] string fieldId,
        [FromQuery] string? lifecycleYear,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fieldId))
        {
            return BadRequest("fieldId is required.");
        }

        var summary = await _financialEntryService.GetFieldSummaryAsync(
            fieldId,
            UserContext.UserId,
            UserContext.Role,
            lifecycleYear,
            cancellationToken);
        return OkResult(summary);
    }

    [HttpGet("overview")]
    public async Task<ActionResult<FinancialOverviewDto>> GetOverview(CancellationToken cancellationToken)
    {
        var overview = await _financialEntryService.GetOverviewAsync(
            UserContext.UserId,
            UserContext.Role,
            cancellationToken);
        return OkResult(overview);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FinancialEntryDto>> GetById(string id, CancellationToken cancellationToken)
    {
        var entry = await _financialEntryService.GetByIdAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        if (entry == null)
        {
            return NotFound();
        }

        return OkResult(entry);
    }

    [HttpPost]
    public async Task<ActionResult<FinancialEntryDto>> Create(
        [FromBody] CreateFinancialEntryDto dto,
        CancellationToken cancellationToken)
    {
        var created = await _financialEntryService.CreateAsync(dto, UserContext.UserId, UserContext.Role, cancellationToken);
        return CreatedResult(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPatch("{id}")]
    public async Task<ActionResult<FinancialEntryDto>> Update(
        string id,
        [FromBody] UpdateFinancialEntryDto dto,
        CancellationToken cancellationToken)
    {
        var updated = await _financialEntryService.UpdateAsync(id, dto, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(updated);
    }

    [HttpPost("{id}/void")]
    public async Task<ActionResult<FinancialEntryDto>> Void(
        string id,
        [FromBody] VoidFinancialEntryDto? dto,
        CancellationToken cancellationToken)
    {
        var voided = await _financialEntryService.VoidAsync(
            id,
            dto ?? new VoidFinancialEntryDto(),
            UserContext.UserId,
            UserContext.Role,
            cancellationToken);
        return OkResult(voided);
    }
}
