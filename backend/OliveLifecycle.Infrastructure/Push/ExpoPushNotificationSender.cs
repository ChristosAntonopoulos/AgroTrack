using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;

namespace OliveLifecycle.Infrastructure.Push;

/// <summary>Sends notifications via the Expo Push API for registered device tokens.</summary>
public sealed class ExpoPushNotificationSender : IPushNotificationSender
{
    private const string ExpoPushUrl = "https://exp.host/--/api/v2/push/send";
    private readonly IDevicePushTokenRepository _tokens;
    private readonly HttpClient _httpClient;
    private readonly ILogger<ExpoPushNotificationSender> _logger;

    public ExpoPushNotificationSender(
        IDevicePushTokenRepository tokens,
        HttpClient httpClient,
        ILogger<ExpoPushNotificationSender> logger)
    {
        _tokens = tokens;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<bool> SendToUserAsync(
        string userId,
        string title,
        string body,
        IReadOnlyDictionary<string, string>? data = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return false;
        }

        var tokens = await _tokens.GetByUserIdAsync(userId, cancellationToken);
        if (tokens.Count == 0)
        {
            return false;
        }

        var messages = tokens
            .Where(t => IsValidExpoToken(t.ExpoPushToken))
            .Select(t => new ExpoPushMessage
            {
                To = t.ExpoPushToken,
                Title = title,
                Body = body,
                Sound = "default",
                Data = data?.ToDictionary(kv => kv.Key, kv => (object)kv.Value)
                    ?? new Dictionary<string, object>()
            })
            .ToList();

        if (messages.Count == 0)
        {
            return false;
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync(ExpoPushUrl, messages, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "Expo push failed for user {UserId}: {Status} {Body}",
                    userId,
                    (int)response.StatusCode,
                    errorBody);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Expo push request failed for user {UserId}", userId);
            return false;
        }
    }

    private static bool IsValidExpoToken(string? token) =>
        !string.IsNullOrWhiteSpace(token) &&
        (token.StartsWith("ExponentPushToken[", StringComparison.Ordinal) ||
         token.StartsWith("ExpoPushToken[", StringComparison.Ordinal));

    private sealed class ExpoPushMessage
    {
        [JsonPropertyName("to")]
        public string To { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("body")]
        public string Body { get; set; } = string.Empty;

        [JsonPropertyName("sound")]
        public string Sound { get; set; } = "default";

        [JsonPropertyName("data")]
        public Dictionary<string, object> Data { get; set; } = new();
    }
}
