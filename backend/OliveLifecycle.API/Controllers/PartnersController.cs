using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Partners;
using OliveLifecycle.Application.Services;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/service-categories")]
public class ServiceCategoriesController : BaseApiController
{
    private readonly IPartnerService _partners;

    public ServiceCategoriesController(IPartnerService partners, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _partners = partners;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ServiceCategoryDto>>> GetAll(
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var categories = await _partners.GetCategoriesAsync(!includeInactive, cancellationToken);
        return OkResult(categories);
    }
}

[Authorize]
[Route("api/v1/me/service-profile")]
public class MeServiceProfileController : BaseApiController
{
    private readonly IPartnerService _partners;

    public MeServiceProfileController(IPartnerService partners, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _partners = partners;
    }

    [HttpGet]
    public async Task<ActionResult<ServiceProviderProfileDto>> GetMine(CancellationToken cancellationToken)
    {
        var profile = await _partners.GetMyProfileAsync(UserContext.UserId, cancellationToken);
        if (profile == null)
        {
            return NotFound();
        }

        return OkResult(profile);
    }

    [HttpPut]
    public async Task<ActionResult<ServiceProviderProfileDto>> Upsert(
        [FromBody] UpsertServiceProfileDto dto,
        CancellationToken cancellationToken)
    {
        var profile = await _partners.UpsertMyProfileAsync(UserContext.UserId, dto, cancellationToken);
        return OkResult(profile);
    }

    [HttpPost("activate")]
    public async Task<ActionResult<ServiceProviderProfileDto>> Activate(CancellationToken cancellationToken)
    {
        var profile = await _partners.ActivateAsync(UserContext.UserId, cancellationToken);
        return OkResult(profile);
    }

    [HttpPost("pause")]
    public async Task<ActionResult<ServiceProviderProfileDto>> Pause(CancellationToken cancellationToken)
    {
        var profile = await _partners.PauseAsync(UserContext.UserId, cancellationToken);
        return OkResult(profile);
    }
}

[Authorize]
[Route("api/v1/partners")]
public class PartnersController : BaseApiController
{
    private readonly IPartnerService _partners;

    public PartnersController(IPartnerService partners, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _partners = partners;
    }

    [HttpGet]
    public async Task<ActionResult<PartnerSearchResponseDto>> Search(
        [FromQuery] string fieldId,
        [FromQuery] string? categoryId,
        [FromQuery] string? category,
        [FromQuery] int? radiusKm,
        [FromQuery] string? availability,
        [FromQuery] string? providerKind,
        [FromQuery] bool verifiedOnly = false,
        CancellationToken cancellationToken = default)
    {
        var results = await _partners.SearchAsync(
            UserContext.UserId,
            UserContext.Role,
            fieldId,
            categoryId,
            category,
            radiusKm,
            availability,
            providerKind,
            verifiedOnly,
            cancellationToken);
        return OkResult(results);
    }

    [HttpGet("{userId}")]
    public async Task<ActionResult<PartnerPublicProfileDto>> GetProfile(
        string userId,
        CancellationToken cancellationToken)
    {
        var profile = await _partners.GetPublicProfileAsync(userId, cancellationToken);
        return OkResult(profile);
    }

    [HttpPost("{userId}/contact")]
    public async Task<ActionResult<ServiceContactRequestDto>> Contact(
        string userId,
        [FromBody] CreatePartnerContactDto dto,
        CancellationToken cancellationToken)
    {
        var request = await _partners.ContactAsync(
            UserContext.UserId,
            UserContext.Role,
            userId,
            dto,
            cancellationToken);
        return OkResult(request);
    }
}

[Authorize]
[Route("api/v1")]
public class ServiceRequestsController : BaseApiController
{
    private readonly IPartnerService _partners;

    public ServiceRequestsController(IPartnerService partners, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _partners = partners;
    }

    [HttpGet("me/service-requests")]
    public async Task<ActionResult<IReadOnlyList<ServiceContactRequestDto>>> GetMine(
        [FromQuery] string? direction,
        CancellationToken cancellationToken)
    {
        var requests = await _partners.GetMyRequestsAsync(UserContext.UserId, direction, cancellationToken);
        return OkResult(requests);
    }

    [HttpPatch("service-requests/{id}")]
    public async Task<ActionResult<ServiceContactRequestDto>> UpdateStatus(
        string id,
        [FromBody] UpdateServiceContactStatusDto dto,
        CancellationToken cancellationToken)
    {
        var updated = await _partners.UpdateRequestStatusAsync(id, UserContext.UserId, dto, cancellationToken);
        return OkResult(updated);
    }
}

[Authorize]
[Route("api/v1/me/notifications")]
public class UserNotificationsController : BaseApiController
{
    private readonly IUserNotificationService _notifications;

    public UserNotificationsController(IUserNotificationService notifications, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserNotificationDto>>> GetMine(CancellationToken cancellationToken)
    {
        var items = await _notifications.GetMineAsync(UserContext.UserId, cancellationToken);
        return OkResult(items);
    }

    [HttpPost("{id}/read")]
    public async Task<ActionResult> MarkRead(string id, CancellationToken cancellationToken)
    {
        await _notifications.MarkReadAsync(id, UserContext.UserId, cancellationToken);
        return NoContent();
    }
}
