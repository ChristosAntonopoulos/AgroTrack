using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Lifecycle;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields/{fieldId}/lifecycle")]
public class LifecycleController : BaseApiController
{
    private readonly ILifecycleService _lifecycleService;

    public LifecycleController(ILifecycleService lifecycleService, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _lifecycleService = lifecycleService;
    }

    [HttpGet]
    public async Task<ActionResult<LifecycleDto>> GetLifecycle(string fieldId, CancellationToken cancellationToken)
    {
        var lifecycle = await _lifecycleService.GetLifecycleByFieldIdAsync(fieldId, UserContext.UserId, UserContext.Role, cancellationToken);
        if (lifecycle == null)
        {
            return NotFound();
        }

        return OkResult(lifecycle);
    }

    [HttpPost("initialize")]
    public async Task<ActionResult<LifecycleDto>> InitializeLifecycle(string fieldId, CancellationToken cancellationToken)
    {
        var lifecycle = await _lifecycleService.InitializeLifecycleAsync(fieldId, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(lifecycle);
    }

    [HttpPost("progress")]
    public async Task<ActionResult<LifecycleDto>> ProgressCycle(string fieldId, CancellationToken cancellationToken)
    {
        var lifecycle = await _lifecycleService.ProgressCycleAsync(fieldId, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(lifecycle);
    }

    [HttpPost("advance-stage")]
    public async Task<ActionResult<LifecycleDto>> AdvanceStage(string fieldId, CancellationToken cancellationToken)
    {
        var lifecycle = await _lifecycleService.AdvanceStageAsync(fieldId, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(lifecycle);
    }

    [HttpPost("revert-stage")]
    public async Task<ActionResult<LifecycleDto>> RevertStage(string fieldId, CancellationToken cancellationToken)
    {
        var lifecycle = await _lifecycleService.RevertStageAsync(fieldId, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(lifecycle);
    }
}
