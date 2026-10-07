namespace OliveLifecycle.Application.Configuration;

/// <summary>Central subscription plan configuration. Bound from appsettings "Subscription".</summary>
public sealed class SubscriptionOptions
{
    public const string SectionName = "Subscription";

    /// <summary>Owned/administered fields allowed on Free.</summary>
    public int FreeOwnedFieldLimit { get; set; } = 1;

    /// <summary>Owned/administered fields allowed on Pro. Change centrally — do not hardcode in UI.</summary>
    public int ProOwnedFieldLimit { get; set; } = 5;

    /// <summary>RevenueCat entitlement identifier for Pro.</summary>
    public string ProEntitlementId { get; set; } = "pro";

    /// <summary>Authorization header value expected on RevenueCat webhooks (Authorization: Bearer …).</summary>
    public string RevenueCatWebhookAuthorization { get; set; } = string.Empty;

    /// <summary>Seconds to hold the per-user field-creation lock.</summary>
    public int FieldCreationLockSeconds { get; set; } = 15;
}
