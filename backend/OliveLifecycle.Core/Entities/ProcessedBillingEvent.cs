namespace OliveLifecycle.Core.Entities;

/// <summary>Idempotency record for provider billing webhooks (e.g. RevenueCat event ids).</summary>
public class ProcessedBillingEvent : BaseEntity
{
    public string ProviderEventId { get; set; } = string.Empty;
    public string Provider { get; set; } = "revenuecat";
    public string? EventType { get; set; }
    public string? AppUserId { get; set; }
    public DateTime ProcessedAt { get; set; }
}
