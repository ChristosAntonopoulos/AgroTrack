using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Admin;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;

namespace OliveLifecycle.API.Controllers;

[Authorize(Policy = PolicyNames.RequireAdministrator)]
[Route("api/v1/admin")]
public class AdminOpsController : BaseApiController
{
    private readonly IAdminOpsService _ops;
    private readonly HealthCheckService _healthChecks;

    public AdminOpsController(
        IAdminOpsService ops,
        HealthCheckService healthChecks,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _ops = ops;
        _healthChecks = healthChecks;
    }

    [HttpGet("overview")]
    public async Task<ActionResult<AdminOverviewDto>> GetOverview(CancellationToken cancellationToken)
    {
        var overview = await _ops.GetOverviewAsync(cancellationToken);
        try
        {
            var health = await _healthChecks.CheckHealthAsync(cancellationToken);
            overview.HealthStatus = health.Status.ToString();
        }
        catch
        {
            overview.HealthStatus = "Unknown";
        }

        return OkResult(overview);
    }

    [HttpGet("users")]
    public async Task<ActionResult<AdminUserPageDto>> ListUsers(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        [FromQuery] string? sortBy = "createdAt",
        CancellationToken cancellationToken = default)
        => OkResult(await _ops.ListUsersAsync(search, role, page, pageSize, sortBy, cancellationToken));

    [HttpGet("users/{id}")]
    public async Task<ActionResult<AdminUserDetailDto>> GetUser(string id, CancellationToken cancellationToken)
        => OkResult(await _ops.GetUserAsync(id, cancellationToken));

    [HttpGet("errors")]
    public async Task<ActionResult<AdminErrorPageDto>> ListErrors(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        [FromQuery] DateTime? since = null,
        [FromQuery] string? pathPrefix = null,
        [FromQuery] int? statusCode = null,
        [FromQuery] bool? unacknowledgedOnly = null,
        CancellationToken cancellationToken = default)
        => OkResult(await _ops.ListErrorsAsync(
            page, pageSize, since, pathPrefix, statusCode, unacknowledgedOnly, cancellationToken));

    [HttpGet("errors/{id}")]
    public async Task<ActionResult<AdminErrorDetailDto>> GetError(string id, CancellationToken cancellationToken)
        => OkResult(await _ops.GetErrorAsync(id, cancellationToken));

    [HttpPost("errors/{id}/ack")]
    public async Task<IActionResult> AcknowledgeError(string id, CancellationToken cancellationToken)
    {
        await _ops.AcknowledgeErrorAsync(id, cancellationToken);
        return NoContent();
    }
}
