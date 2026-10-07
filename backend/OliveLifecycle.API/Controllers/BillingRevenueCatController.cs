using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration;

namespace OliveLifecycle.API.Controllers;

/// <summary>Authenticated RevenueCat webhook receiver. Maps events into BillingProfile.</summary>
[AllowAnonymous]
[Route("api/v1/billing/revenuecat")]
public class BillingRevenueCatController : ControllerBase
{
    private readonly ISubscriptionService _subscriptions;
    private readonly SubscriptionOptions _options;
    private readonly ILogger<BillingRevenueCatController> _logger;

    public BillingRevenueCatController(
        ISubscriptionService subscriptions,
        IOptions<SubscriptionOptions> options,
        ILogger<BillingRevenueCatController> logger)
    {
        _subscriptions = subscriptions;
        _options = options.Value;
        _logger = logger;
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook(CancellationToken cancellationToken)
    {
        if (!IsAuthorized())
        {
            _logger.LogWarning("Rejected unauthenticated RevenueCat webhook");
            return Unauthorized();
        }

        using var document = await JsonDocument.ParseAsync(Request.Body, cancellationToken: cancellationToken);
        var root = document.RootElement;
        if (!root.TryGetProperty("event", out var eventElement))
        {
            return BadRequest(new { message = "Missing event payload." });
        }

        var mapped = MapEvent(eventElement);
        if (string.IsNullOrWhiteSpace(mapped.EventId))
        {
            return BadRequest(new { message = "Missing event id." });
        }

        await _subscriptions.ApplyRevenueCatEventAsync(mapped, cancellationToken);
        return Ok(new { received = true });
    }

    private bool IsAuthorized()
    {
        var expected = _options.RevenueCatWebhookAuthorization?.Trim();
        if (string.IsNullOrWhiteSpace(expected))
        {
            _logger.LogError("Subscription:RevenueCatWebhookAuthorization is not configured");
            return false;
        }

        if (!Request.Headers.TryGetValue("Authorization", out var header))
        {
            return false;
        }

        var value = header.ToString().Trim();
        if (value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            value = value["Bearer ".Length..].Trim();
        }

        return string.Equals(value, expected, StringComparison.Ordinal);
    }

    private RevenueCatWebhookEventDto MapEvent(JsonElement eventElement)
    {
        var type = ReadString(eventElement, "type") ?? string.Empty;
        var appUserId = ReadString(eventElement, "app_user_id")
            ?? ReadString(eventElement, "appUserId")
            ?? string.Empty;

        var productId = ReadString(eventElement, "product_id")
            ?? ReadString(eventElement, "productId");
        var store = ReadString(eventElement, "store");

        DateTime? expiration = null;
        if (TryReadLong(eventElement, "expiration_at_ms", out var expMs))
        {
            expiration = DateTimeOffset.FromUnixTimeMilliseconds(expMs).UtcDateTime;
        }

        var eventId = ReadString(eventElement, "id")
            ?? ReadString(eventElement, "event_id")
            ?? $"{type}:{appUserId}:{ReadString(eventElement, "event_timestamp_ms") ?? Guid.NewGuid().ToString("N")}";

        var entitlementIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (eventElement.TryGetProperty("entitlement_ids", out var entitlementArray) &&
            entitlementArray.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in entitlementArray.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String)
                {
                    entitlementIds.Add(item.GetString() ?? string.Empty);
                }
            }
        }

        var singleEntitlement = ReadString(eventElement, "entitlement_id");
        if (!string.IsNullOrWhiteSpace(singleEntitlement))
        {
            entitlementIds.Add(singleEntitlement);
        }

        var proEntitlement = _options.ProEntitlementId;
        var looksLikePro = entitlementIds.Contains(proEntitlement) ||
                           type.Equals("INITIAL_PURCHASE", StringComparison.OrdinalIgnoreCase) ||
                           type.Equals("RENEWAL", StringComparison.OrdinalIgnoreCase) ||
                           type.Equals("UNCANCELLATION", StringComparison.OrdinalIgnoreCase) ||
                           type.Equals("PRODUCT_CHANGE", StringComparison.OrdinalIgnoreCase) ||
                           type.Equals("CANCELLATION", StringComparison.OrdinalIgnoreCase) ||
                           type.Equals("BILLING_ISSUE", StringComparison.OrdinalIgnoreCase);

        var expired = type.Equals("EXPIRATION", StringComparison.OrdinalIgnoreCase) ||
                      type.Equals("SUBSCRIPTION_PAUSED", StringComparison.OrdinalIgnoreCase);

        bool? willRenew = null;
        if (TryReadBool(eventElement, "will_renew", out var wr) || TryReadBool(eventElement, "willRenew", out wr))
        {
            willRenew = wr;
        }

        var eventTimestamp = DateTime.UtcNow;
        if (TryReadLong(eventElement, "event_timestamp_ms", out var tsMs))
        {
            eventTimestamp = DateTimeOffset.FromUnixTimeMilliseconds(tsMs).UtcDateTime;
        }

        return new RevenueCatWebhookEventDto
        {
            EventId = eventId,
            Type = type,
            AppUserId = appUserId,
            ProductId = productId,
            Store = store,
            ExpirationAt = expiration,
            WillRenew = willRenew,
            EntitlementActive = looksLikePro && !expired,
            EventTimestamp = eventTimestamp,
            EntitlementId = entitlementIds.Contains(proEntitlement)
                ? proEntitlement
                : entitlementIds.FirstOrDefault()
        };
    }

    private static string? ReadString(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String)
        {
            return value.GetString();
        }

        return null;
    }

    private static bool TryReadLong(JsonElement element, string propertyName, out long value)
    {
        value = 0;
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return false;
        }

        if (prop.ValueKind == JsonValueKind.Number && prop.TryGetInt64(out value))
        {
            return true;
        }

        if (prop.ValueKind == JsonValueKind.String && long.TryParse(prop.GetString(), out value))
        {
            return true;
        }

        return false;
    }

    private static bool TryReadBool(JsonElement element, string propertyName, out bool value)
    {
        value = false;
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return false;
        }

        if (prop.ValueKind == JsonValueKind.True || prop.ValueKind == JsonValueKind.False)
        {
            value = prop.GetBoolean();
            return true;
        }

        return false;
    }
}
