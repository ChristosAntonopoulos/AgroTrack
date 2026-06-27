using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/ministry/notifications")]
public class MinistryNotificationsController : BaseApiController
{
    private readonly IMinistryNotificationService _ministryNotificationService;

    public MinistryNotificationsController(
        IMinistryNotificationService ministryNotificationService,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _ministryNotificationService = ministryNotificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] bool urgentOnly = false, CancellationToken cancellationToken = default)
    {
        var notifications = await _ministryNotificationService.GetNotificationsAsync(
            UserContext.Role, UserContext.UserId, urgentOnly, cancellationToken);
        return Ok(notifications);
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(string id, CancellationToken cancellationToken)
    {
        await _ministryNotificationService.MarkAsReadAsync(UserContext.UserId, id, cancellationToken);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        await _ministryNotificationService.MarkAllAsReadAsync(UserContext.Role, UserContext.UserId, cancellationToken);
        return NoContent();
    }
}
