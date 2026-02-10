using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.DTOs.Lifecycle;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[ApiController]
[Route("api/v1/fields/{fieldId}/lifecycle")]
[Authorize]
public class LifecycleController : ControllerBase
{
    private readonly ILifecycleService _lifecycleService;
    private readonly ILogger<LifecycleController> _logger;

    public LifecycleController(ILifecycleService lifecycleService, ILogger<LifecycleController> logger)
    {
        _lifecycleService = lifecycleService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<LifecycleDto>> GetLifecycle(string fieldId)
    {
        try
        {
            var lifecycle = await _lifecycleService.GetLifecycleByFieldIdAsync(fieldId);
            if (lifecycle == null)
            {
                return NotFound();
            }

            return Ok(lifecycle);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving lifecycle for field {FieldId}", fieldId);
            return StatusCode(500, new { message = "An error occurred while retrieving the lifecycle." });
        }
    }

    [HttpPost("initialize")]
    public async Task<ActionResult<LifecycleDto>> InitializeLifecycle(string fieldId)
    {
        try
        {
            var lifecycle = await _lifecycleService.InitializeLifecycleAsync(fieldId);
            _logger.LogInformation("Lifecycle initialized for field {FieldId}", fieldId);
            return Ok(lifecycle);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing lifecycle for field {FieldId}", fieldId);
            return StatusCode(500, new { message = "An error occurred while initializing the lifecycle." });
        }
    }

    [HttpPost("progress")]
    public async Task<ActionResult<LifecycleDto>> ProgressCycle(string fieldId)
    {
        try
        {
            var lifecycle = await _lifecycleService.ProgressCycleAsync(fieldId);
            _logger.LogInformation("Lifecycle progressed for field {FieldId}", fieldId);
            return Ok(lifecycle);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error progressing lifecycle for field {FieldId}", fieldId);
            return StatusCode(500, new { message = "An error occurred while progressing the lifecycle." });
        }
    }
}
