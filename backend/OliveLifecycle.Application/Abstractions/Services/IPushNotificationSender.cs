namespace OliveLifecycle.Application.Abstractions.Services;

/// <summary>Sends mobile push notifications (e.g. Expo). No-op when unset or unconfigured.</summary>
public interface IPushNotificationSender
{
    Task<bool> SendToUserAsync(
        string userId,
        string title,
        string body,
        IReadOnlyDictionary<string, string>? data = null,
        CancellationToken cancellationToken = default);
}
