using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Harvest;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/harvest-records")]
public class HarvestRecordsController : BaseApiController
{
    private readonly IHarvestService _harvestService;

    public HarvestRecordsController(IHarvestService harvestService, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _harvestService = harvestService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<HarvestRecordDetailDto>>> GetByField(
        [FromQuery] string fieldId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(fieldId))
        {
            return BadRequest("fieldId is required.");
        }

        var records = await _harvestService.GetByFieldIdAsync(fieldId, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(records);
    }

    [HttpPost]
    public async Task<ActionResult<HarvestRecordDetailDto>> Create(
        [FromBody] CreateHarvestRecordDto dto,
        CancellationToken cancellationToken)
    {
        var created = await _harvestService.CreateAsync(dto, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(created);
    }

    [HttpPost("{id}/void")]
    public async Task<ActionResult<HarvestRecordDetailDto>> Void(
        string id,
        [FromBody] VoidHarvestRecordDto? dto,
        CancellationToken cancellationToken)
    {
        var voided = await _harvestService.VoidAsync(
            id,
            dto ?? new VoidHarvestRecordDto(),
            UserContext.UserId,
            UserContext.Role,
            cancellationToken);
        return OkResult(voided);
    }
}
