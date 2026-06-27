using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields")]
public class FieldsController : BaseApiController
{
    private readonly IFieldService _fieldService;

    public FieldsController(IFieldService fieldService, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _fieldService = fieldService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FieldDto>>> GetFields(CancellationToken cancellationToken)
    {
        var fields = await _fieldService.GetFieldsForUserAsync(UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(fields);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FieldDto>> GetField(string id, CancellationToken cancellationToken)
    {
        var field = await _fieldService.GetFieldByIdAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        if (field == null)
        {
            return NotFound();
        }

        return OkResult(field);
    }

    [HttpPost]
    public async Task<ActionResult<FieldDto>> CreateField([FromBody] CreateFieldDto createFieldDto, CancellationToken cancellationToken)
    {
        var field = await _fieldService.CreateFieldAsync(UserContext.UserId, createFieldDto, cancellationToken);
        return CreatedResult(nameof(GetField), new { id = field.Id }, field);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<FieldDto>> UpdateField(string id, [FromBody] UpdateFieldDto updateFieldDto, CancellationToken cancellationToken)
    {
        var field = await _fieldService.UpdateFieldAsync(id, UserContext.UserId, updateFieldDto, cancellationToken);
        return OkResult(field);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteField(string id, CancellationToken cancellationToken)
    {
        var deleted = await _fieldService.DeleteFieldAsync(id, UserContext.UserId, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpGet("{id}/producers")]
    public async Task<ActionResult<IEnumerable<string>>> GetAssignedProducers(string id, CancellationToken cancellationToken)
    {
        var producerIds = await _fieldService.GetAssignedProducerIdsAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(producerIds);
    }

    [HttpPut("{id}/producers/{producerId}")]
    public async Task<IActionResult> AssignProducer(string id, string producerId, CancellationToken cancellationToken)
    {
        await _fieldService.AssignProducerAsync(id, UserContext.UserId, producerId, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id}/producers/{producerId}")]
    public async Task<IActionResult> UnassignProducer(string id, string producerId, CancellationToken cancellationToken)
    {
        await _fieldService.UnassignProducerAsync(id, UserContext.UserId, producerId, cancellationToken);
        return NoContent();
    }
}
