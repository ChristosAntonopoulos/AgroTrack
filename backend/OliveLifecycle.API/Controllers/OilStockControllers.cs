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

    [HttpGet("cellar-candidates")]
    public async Task<ActionResult<IReadOnlyList<OilCellarCandidateDto>>> CellarCandidates(
        [FromQuery] string? fieldIds,
        CancellationToken cancellationToken)
    {
        var ids = (fieldIds ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var rows = await _stock.ListCellarCandidatesAsync(UserContext.UserId, ids, cancellationToken);
        return OkResult(rows);
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

    [HttpGet("share-source")]
    public async Task<ActionResult<OilShareSourceDto?>> ShareSource(
        [FromQuery] string? fieldIds,
        CancellationToken cancellationToken)
    {
        var ids = (fieldIds ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var source = await _stock.GetShareSourceAsync(UserContext.UserId, ids, cancellationToken);
        return OkResult(source);
    }

    [HttpGet("share-requests")]
    public async Task<ActionResult<IReadOnlyList<OilShareRequestDto>>> ListShareRequests(
        [FromQuery] bool pendingOnly = true,
        CancellationToken cancellationToken = default)
    {
        var rows = await _stock.ListShareRequestsAsync(UserContext.UserId, pendingOnly, cancellationToken);
        return OkResult(rows);
    }

    [HttpPost("share-requests")]
    public async Task<ActionResult<OilShareRequestDto>> CreateShareRequest(
        [FromBody] CreateOilShareRequestDto dto,
        CancellationToken cancellationToken)
    {
        var created = await _stock.CreateShareRequestAsync(UserContext.UserId, dto, cancellationToken);
        return OkResult(created);
    }

    [HttpPost("share-requests/{id}/accept")]
    public async Task<ActionResult<OilShareRequestDto>> AcceptShareRequest(
        string id,
        CancellationToken cancellationToken)
    {
        var updated = await _stock.AcceptShareRequestAsync(UserContext.UserId, id, cancellationToken);
        return OkResult(updated);
    }

    [HttpPost("transfers")]
    public async Task<ActionResult<OilTransferDto>> Transfer(
        [FromBody] TransferOilDto dto,
        CancellationToken cancellationToken)
    {
        var moved = await _stock.TransferToUserAsync(UserContext.UserId, dto, cancellationToken);
        return OkResult(moved);
    }

    [HttpPost("share-requests/{id}/reject")]
    public async Task<ActionResult<OilShareRequestDto>> RejectShareRequest(
        string id,
        CancellationToken cancellationToken)
    {
        var updated = await _stock.RejectShareRequestAsync(UserContext.UserId, id, cancellationToken);
        return OkResult(updated);
    }
}

[Authorize]
[Route("api/v1/oil-pressings")]
public class OilPressingsController : BaseApiController
{
    private readonly IOilStockService _stock;

    public OilPressingsController(IOilStockService stock, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _stock = stock;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OilPressingDto>>> List(
        [FromQuery] int? year,
        CancellationToken cancellationToken)
    {
        var rows = await _stock.ListPressingsAsync(UserContext.UserId, year, cancellationToken);
        return OkResult(rows);
    }

    /// <summary>Mill tickets still waiting for the grove admin to say who takes what.</summary>
    [HttpGet("pending")]
    public async Task<ActionResult<IReadOnlyList<OilPressingDto>>> Pending(
        CancellationToken cancellationToken)
    {
        var rows = await _stock.ListPendingAllocationsAsync(UserContext.UserId, cancellationToken);
        return OkResult(rows);
    }

    [HttpPost]
    public async Task<ActionResult<OilPressingDto>> Create(
        [FromBody] CreateOilPressingDto dto,
        CancellationToken cancellationToken)
    {
        var pressing = await _stock.CreatePressingAsync(UserContext.UserId, dto, cancellationToken);
        return OkResult(pressing);
    }

    [HttpPost("{id}/allocate")]
    public async Task<ActionResult<OilPressingDto>> Allocate(
        string id,
        [FromBody] AllocateOilPressingDto dto,
        CancellationToken cancellationToken)
    {
        var pressing = await _stock.AllocatePressingAsync(UserContext.UserId, id, dto, cancellationToken);
        return OkResult(pressing);
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

    [HttpPost("{id}/reverse")]
    public async Task<ActionResult<StockMovementDto>> Reverse(
        string id,
        CancellationToken cancellationToken)
    {
        var reversal = await _stock.ReverseMovementAsync(UserContext.UserId, id, cancellationToken);
        return OkResult(reversal);
    }
}
