using OliveLifecycle.Application.Abstractions.Services;
using Microsoft.Extensions.Logging;

namespace OliveLifecycle.Application.Services;

/// <summary>Placeholder until Expo push tokens are wired. Always returns false.</summary>
public sealed class NoOpPushNotificationSender : IPushNotificationSender
{
    private readonly ILogger<NoOpPushNotificationSender> _logger;

    public NoOpPushNotificationSender(ILogger<NoOpPushNotificationSender> logger)
    {
        _logger = logger;
    }

    public Task<bool> SendToUserAsync(
        string userId,
        string title,
        string body,
        IReadOnlyDictionary<string, string>? data = null,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Push skipped (no-op) for user {UserId}: {Title}", userId, title);
        return Task.FromResult(false);
    }
}
