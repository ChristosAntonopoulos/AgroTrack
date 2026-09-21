using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Activity;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;

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
        if (!await _fieldAccessService.CanUserAccessFieldModuleAsync(
                fieldId, UserContext.UserId, UserContext.Role, FamilyModules.Chronologio, cancellationToken))
        {
            throw new OliveLifecycle.Core.Exceptions.ForbiddenException("You do not have access to Chronologio for this field.");
        }

        var activities = (await _activityService.GetByFieldIdAsync(fieldId, limit, cancellationToken)).ToList();
        var canMoney = await _fieldAccessService.CanFamilyAccessModuleAsync(
            fieldId, UserContext.UserId, FamilyModules.Money, cancellationToken)
            || string.Equals(UserContext.Role, Roles.Administrator, StringComparison.Ordinal);
        var canHarvest = await _fieldAccessService.CanFamilyAccessModuleAsync(
            fieldId, UserContext.UserId, FamilyModules.Harvest, cancellationToken)
            || string.Equals(UserContext.Role, Roles.Administrator, StringComparison.Ordinal);

        if (!canMoney)
        {
            activities = activities
                .Where(a => !a.Type.StartsWith("financial_", StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        if (!canHarvest)
        {
            activities = activities
                .Where(a => !a.Type.StartsWith("harvest_", StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return OkResult((IEnumerable<ActivityDto>)activities);
    }
}
