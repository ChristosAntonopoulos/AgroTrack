using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Subscription;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/me/subscription")]
public class MeSubscriptionController : BaseApiController
{
    private readonly ISubscriptionService _subscriptions;

    public MeSubscriptionController(
        ISubscriptionService subscriptions,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _subscriptions = subscriptions;
    }

    [HttpGet]
    public async Task<ActionResult<SubscriptionSnapshotDto>> Get(CancellationToken cancellationToken)
    {
        var snapshot = await _subscriptions.GetSubscriptionSnapshotAsync(UserContext.UserId, cancellationToken);
        return OkResult(snapshot);
    }

    /// <summary>
    /// Client hint after a successful RevenueCat purchase while the webhook may still be in flight.
    /// Backend remains authoritative; this only bridges briefly when CustomerInfo already shows Pro.
    /// </summary>
    [HttpPost("refresh")]
    public async Task<ActionResult<SubscriptionSnapshotDto>> Refresh(
        [FromBody] ClientSubscriptionHintDto? hint,
        CancellationToken cancellationToken)
    {
        var snapshot = await _subscriptions.RefreshFromClientHintAsync(UserContext.UserId, hint, cancellationToken);
        return OkResult(snapshot);
    }

    [HttpGet("owned-fields")]
    public async Task<ActionResult<IReadOnlyList<OwnedFieldSummaryDto>>> GetOwnedFields(
        CancellationToken cancellationToken)
    {
        var fields = await _subscriptions.GetOwnedFieldSummariesAsync(UserContext.UserId, cancellationToken);
        return OkResult(fields);
    }

    [HttpPost("writable-field")]
    public async Task<ActionResult<SubscriptionSnapshotDto>> SelectWritableField(
        [FromBody] SelectWritableFieldDto dto,
        CancellationToken cancellationToken)
    {
        await _subscriptions.SelectWritableFieldAsync(UserContext.UserId, dto.FieldId, cancellationToken);
        var snapshot = await _subscriptions.GetSubscriptionSnapshotAsync(UserContext.UserId, cancellationToken);
        return OkResult(snapshot);
    }
}
