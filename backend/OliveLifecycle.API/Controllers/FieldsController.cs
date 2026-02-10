using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[ApiController]
[Route("api/v1/fields")]
[Authorize]
public class FieldsController : ControllerBase
{
    private readonly IFieldService _fieldService;
    private readonly ILogger<FieldsController> _logger;

    public FieldsController(IFieldService fieldService, ILogger<FieldsController> logger)
    {
        _fieldService = fieldService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FieldDto>>> GetFields()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var fields = await _fieldService.GetFieldsForUserAsync(userId, userRole ?? "");
            return Ok(fields);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving fields");
            return StatusCode(500, new { message = "An error occurred while retrieving fields." });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FieldDto>> GetField(string id)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var field = await _fieldService.GetFieldByIdAsync(id, userId, userRole ?? "");
            if (field == null)
            {
                return NotFound();
            }

            return Ok(field);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving field {FieldId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving the field." });
        }
    }

    [HttpPost]
    public async Task<ActionResult<FieldDto>> CreateField([FromBody] CreateFieldDto createFieldDto)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var field = await _fieldService.CreateFieldAsync(userId, createFieldDto);
            _logger.LogInformation("Field created: {FieldId} by user {UserId}", field.Id, userId);
            return CreatedAtAction(nameof(GetField), new { id = field.Id }, field);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating field");
            return StatusCode(500, new { message = "An error occurred while creating the field." });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<FieldDto>> UpdateField(string id, [FromBody] UpdateFieldDto updateFieldDto)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var field = await _fieldService.UpdateFieldAsync(id, userId, updateFieldDto);
            _logger.LogInformation("Field updated: {FieldId} by user {UserId}", id, userId);
            return Ok(field);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating field {FieldId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the field." });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteField(string id)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var deleted = await _fieldService.DeleteFieldAsync(id, userId);
            if (!deleted)
            {
                return NotFound();
            }

            _logger.LogInformation("Field deleted: {FieldId} by user {UserId}", id, userId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting field {FieldId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting the field." });
        }
    }
}
