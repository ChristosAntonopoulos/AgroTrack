using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/me/push-tokens")]
public class MePushTokensController : BaseApiController
{
    private readonly IDevicePushTokenRepository _tokens;
    private readonly IDateTimeProvider _clock;

    public MePushTokensController(
        IDevicePushTokenRepository tokens,
        IDateTimeProvider clock,
        ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _tokens = tokens;
        _clock = clock;
    }

    [HttpPost]
    public async Task<ActionResult<object>> Register(
        [FromBody] RegisterPushTokenRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ExpoPushToken))
        {
            return BadRequest(new { error = new { message = "Expo push token is required." } });
        }

        var platform = string.IsNullOrWhiteSpace(request.Platform)
            ? "unknown"
            : request.Platform.Trim().ToLowerInvariant();

        await _tokens.UpsertAsync(new DevicePushToken
        {
            UserId = UserContext.UserId,
            Platform = platform,
            ExpoPushToken = request.ExpoPushToken.Trim(),
            CreatedAt = _clock.UtcNow,
            UpdatedAt = _clock.UtcNow
        }, cancellationToken);

        return OkResult(new { registered = true });
    }

    [HttpDelete]
    public async Task<ActionResult<object>> Unregister(
        [FromBody] UnregisterPushTokenRequest? request,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(request?.ExpoPushToken))
        {
            await _tokens.DeleteByTokenAsync(UserContext.UserId, request.ExpoPushToken.Trim(), cancellationToken);
        }
        else
        {
            await _tokens.DeleteByUserIdAsync(UserContext.UserId, cancellationToken);
        }

        return OkResult(new { cleared = true });
    }

    public sealed class RegisterPushTokenRequest
    {
        public string ExpoPushToken { get; set; } = string.Empty;
        public string? Platform { get; set; }
    }

    public sealed class UnregisterPushTokenRequest
    {
        public string? ExpoPushToken { get; set; }
    }
}
