using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/financial-transactions")]
public class FinancialTransactionsController : BaseApiController
{
    private readonly IFinancialTransactionService _financialTransactions;

    public FinancialTransactionsController(
        IFinancialTransactionService financialTransactions,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _financialTransactions = financialTransactions;
    }

    [HttpGet]
    public async Task<ActionResult<FinancialTransactionListDto>> List(
        [FromQuery] int? resultYear,
        [FromQuery] string? fieldId,
        [FromQuery] string? type,
        [FromQuery] string? status,
        [FromQuery] string? category,
        [FromQuery] int? month,
        [FromQuery] string? relatedTaskId,
        [FromQuery] string? relatedHarvestId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _financialTransactions.ListAsync(
            new FinancialTransactionListQuery
            {
                ResultYear = resultYear,
                FieldId = fieldId,
                Type = type,
                Status = status,
                Category = category,
                Month = month,
                RelatedTaskId = relatedTaskId,
                RelatedHarvestId = relatedHarvestId,
                Page = page,
                PageSize = pageSize
            },
            UserContext.UserId,
            UserContext.Role,
            cancellationToken);
        return OkResult(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FinancialTransactionDto>> GetById(string id, CancellationToken cancellationToken)
    {
        var transaction = await _financialTransactions.GetByIdAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        if (transaction == null)
        {
            return NotFound();
        }

        return OkResult(transaction);
    }

    [HttpPost]
    public async Task<ActionResult<FinancialTransactionDto>> Create(
        [FromBody] CreateFinancialTransactionDto dto,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.IdempotencyKey)
            && Request.Headers.TryGetValue("Idempotency-Key", out var headerKey))
        {
            dto.IdempotencyKey = headerKey.ToString();
        }

        var created = await _financialTransactions.CreateAsync(dto, UserContext.UserId, UserContext.Role, cancellationToken);
        return CreatedResult(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<FinancialTransactionDto>> Update(
        string id,
        [FromBody] UpdateFinancialTransactionDto dto,
        CancellationToken cancellationToken)
    {
        var updated = await _financialTransactions.UpdateAsync(id, dto, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(updated);
    }

    [HttpPost("{id}/post")]
    public async Task<ActionResult<FinancialTransactionDto>> Post(string id, CancellationToken cancellationToken)
    {
        var posted = await _financialTransactions.PostAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(posted);
    }

    [HttpPost("{id}/void")]
    public async Task<ActionResult<FinancialTransactionDto>> Void(
        string id,
        [FromBody] VoidFinancialTransactionDto? dto,
        CancellationToken cancellationToken)
    {
        var voided = await _financialTransactions.VoidAsync(
            id,
            dto ?? new VoidFinancialTransactionDto(),
            UserContext.UserId,
            UserContext.Role,
            cancellationToken);
        return OkResult(voided);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDraft(string id, CancellationToken cancellationToken)
    {
        await _financialTransactions.DeleteDraftAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        return NoContent();
    }
}
