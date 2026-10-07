using System.Security.Claims;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;

namespace OliveLifecycle.API.Middleware;

/// <summary>Throttled LastSeenAt updates for authenticated requests.</summary>
public class UserActivityMiddleware
{
    private static readonly TimeSpan MinAge = TimeSpan.FromMinutes(15);

    private readonly RequestDelegate _next;

    public UserActivityMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IUserRepository users, IDateTimeProvider clock)
    {
        await _next(context);

        if (context.User?.Identity?.IsAuthenticated != true)
        {
            return;
        }

        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return;
        }

        try
        {
            await users.TouchLastSeenAsync(userId, clock.UtcNow, MinAge, context.RequestAborted);
        }
        catch
        {
            // Activity stamping must never break the response.
        }
    }
}
