using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Activity;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/fields/{fieldId}/activities")]
public class ActivitiesController : BaseApiController
{
    private readonly IActivityService _activityService;
    private readonly IFieldAccessService _fieldAccessService;

    public ActivitiesController(
        IActivityService activityService,
        IFieldAccessService fieldAccessService,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _activityService = activityService;
        _fieldAccessService = fieldAccessService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ActivityDto>>> GetActivities(
        string fieldId,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(fieldId, UserContext.UserId, UserContext.Role, cancellationToken))
        {
            throw new OliveLifecycle.Core.Exceptions.ForbiddenException("You do not have access to this field.");
        }

        var activities = await _activityService.GetByFieldIdAsync(fieldId, limit, cancellationToken);
        return OkResult(activities);
    }
}
