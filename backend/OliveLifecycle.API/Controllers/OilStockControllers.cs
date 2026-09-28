using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.OilStock;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/oil-lots")]
public class OilLotsController : BaseApiController
{
    private readonly IOilStockService _stock;

    public OilLotsController(IOilStockService stock, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _stock = stock;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<OilStockSummaryDto>> Summary(
        [FromQuery] int? year,
        [FromQuery] string? fieldId,
        CancellationToken cancellationToken)
    {
        var summary = await _stock.GetSummaryAsync(
            UserContext.UserId,
            year,
            fieldId,
            cancellationToken);
        return OkResult(summary);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OilLotDto>>> List(
        [FromQuery] int? year,
        [FromQuery] string? fieldId,
        CancellationToken cancellationToken)
    {
        var lots = await _stock.ListLotsAsync(
            UserContext.UserId,
            year,
            fieldId,
            cancellationToken);
        return OkResult(lots);
    }

    [HttpPost]
    public async Task<ActionResult<OilLotDto>> Upsert(
        [FromBody] UpsertOilLotDto dto,
        CancellationToken cancellationToken)
    {
        var lot = await _stock.UpsertLotAsync(UserContext.UserId, dto, cancellationToken);
        return OkResult(lot);
    }

    [HttpPatch("{id}/packing")]
    public async Task<ActionResult<OilLotDto>> PatchPacking(
        string id,
        [FromBody] PatchOilLotPackingDto dto,
        CancellationToken cancellationToken)
    {
        var lot = await _stock.PatchPackingAsync(UserContext.UserId, id, dto, cancellationToken);
        return OkResult(lot);
    }

    [HttpPost("{id}/repack")]
    public async Task<ActionResult<OilLotDto>> Repack(
        string id,
        [FromBody] RepackOilLotDto dto,
        CancellationToken cancellationToken)
    {
        var lot = await _stock.RepackAsync(UserContext.UserId, id, dto, cancellationToken);
        return OkResult(lot);
    }

    [HttpPost("adjust")]
    public async Task<ActionResult> Adjust(
        [FromBody] AdjustStockDto dto,
        CancellationToken cancellationToken)
    {
        await _stock.AdjustStockAsync(UserContext.UserId, dto, cancellationToken);
        return NoContent();
    }
}

[Authorize]
[Route("api/v1/oil-commitments")]
public class OilCommitmentsController : BaseApiController
{
    private readonly IOilStockService _stock;

    public OilCommitmentsController(IOilStockService stock, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _stock = stock;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OilCommitmentDto>>> List(
        [FromQuery] bool openOnly = true,
        CancellationToken cancellationToken = default)
    {
        var rows = await _stock.ListCommitmentsAsync(UserContext.UserId, openOnly, cancellationToken);
        return OkResult(rows);
    }

    [HttpPost]
    public async Task<ActionResult<OilCommitmentDto>> Create(
        [FromBody] CreateOilCommitmentDto dto,
        CancellationToken cancellationToken)
    {
        var created = await _stock.CreateCommitmentAsync(
            UserContext.UserId,
            UserContext.Role,
            dto,
            cancellationToken);
        return OkResult(created);
    }

    [HttpPost("{id}/deliver")]
    public async Task<ActionResult<OilCommitmentDto>> Deliver(
        string id,
        [FromBody] DeliverOilCommitmentDto? dto,
        CancellationToken cancellationToken)
    {
        var updated = await _stock.DeliverAsync(
            UserContext.UserId,
            id,
            dto ?? new DeliverOilCommitmentDto(),
            cancellationToken);
        return OkResult(updated);
    }

    [HttpPost("{id}/cancel")]
    public async Task<ActionResult> Cancel(string id, CancellationToken cancellationToken)
    {
        await _stock.CancelCommitmentAsync(UserContext.UserId, id, cancellationToken);
        return NoContent();
    }
}

[Authorize]
[Route("api/v1/stock-movements")]
public class StockMovementsController : BaseApiController
{
    private readonly IOilStockService _stock;

    public StockMovementsController(IOilStockService stock, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _stock = stock;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StockMovementDto>>> List(
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        var rows = await _stock.ListMovementsAsync(UserContext.UserId, limit, cancellationToken);
        return OkResult(rows);
    }
}
