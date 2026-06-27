using System.Security.Claims;
using OliveLifecycle.Common.Constants;

namespace OliveLifecycle.API.Middleware;

/// <summary>
/// When Auth:AllowAnonymous is true, unauthenticated requests run as the configured dev user.
/// Development only — never enable in production.
/// </summary>
public class AnonymousAuthBypassMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AnonymousAuthBypassMiddleware> _logger;

    public AnonymousAuthBypassMiddleware(
        RequestDelegate next,
        IConfiguration configuration,
        ILogger<AnonymousAuthBypassMiddleware> logger)
    {
        _next = next;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (IsEnabled() && context.User.Identity?.IsAuthenticated != true)
        {
            var userId = _configuration["Auth:DevUserId"] ?? "675555555555555555555501";
            var role = _configuration["Auth:DevUserRole"] ?? Roles.FieldOwner;
            var email = _configuration["Auth:DevUserEmail"] ?? "dev@local";

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.Email, email),
            };

            context.User = new ClaimsPrincipal(
                new ClaimsIdentity(claims, authenticationType: "DevBypass"));

            _logger.LogDebug("Anonymous auth bypass: acting as {UserId} ({Role})", userId, role);
        }

        await _next(context);
    }

    private bool IsEnabled() => _configuration.GetValue<bool>("Auth:AllowAnonymous");
}
