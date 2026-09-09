using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Dashboard;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/me/dashboard")]
public class MeDashboardController : BaseApiController
{
    private readonly IMeDashboardService _dashboard;

    public MeDashboardController(IMeDashboardService dashboard, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _dashboard = dashboard;
    }

    /// <summary>
    /// Per-user action counts, pending work, sparkline series, and recent activity.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<MeDashboardDto>> Get(
        [FromQuery] string? period = "week",
        CancellationToken cancellationToken = default)
    {
        var dto = await _dashboard.GetAsync(
            UserContext.UserId,
            UserContext.Role,
            period,
            cancellationToken);
        return OkResult(dto);
    }
}
