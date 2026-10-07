using OliveLifecycle.Application.DTOs.Subscription;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Subscription;

namespace OliveLifecycle.Application.Abstractions.Services;

public interface ISubscriptionService
{
    SubscriptionPlanDefinition GetPlanDefinition(PlanCode planCode);

    Task<PlanCode> GetPlanForUserAsync(string userId, CancellationToken cancellationToken = default);

    Task<int> GetOwnedFieldLimitAsync(string userId, CancellationToken cancellationToken = default);

    Task<int> CountOwnedFieldsAsync(string userId, CancellationToken cancellationToken = default);

    Task<bool> CanCreateOwnedFieldAsync(string userId, CancellationToken cancellationToken = default);

    Task AssertCanCreateOwnedFieldAsync(string userId, CancellationToken cancellationToken = default);

    Task ReleaseFieldCreationLockAsync(string userId, CancellationToken cancellationToken = default);

    Task AssertCanTransferOwnershipAsync(string newOwnerUserId, CancellationToken cancellationToken = default);

    Task<SubscriptionSnapshotDto> GetSubscriptionSnapshotAsync(string userId, CancellationToken cancellationToken = default);

    Task<BillingProfile> GetOrCreateBillingProfileAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>Whether the billing owner may write this field under the current plan/selection.</summary>
    Task<bool> IsOwnedFieldWritableAsync(string ownerUserId, string fieldId, CancellationToken cancellationToken = default);

    Task SelectWritableFieldAsync(string userId, string fieldId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OwnedFieldSummaryDto>> GetOwnedFieldSummariesAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>After deleting an owned field, promote another writable grove if Free entitlement would otherwise be unusable.</summary>
    Task OnOwnedFieldDeletedAsync(string userId, string deletedFieldId, CancellationToken cancellationToken = default);

    Task ApplyRevenueCatEventAsync(RevenueCatWebhookEventDto webhookEvent, CancellationToken cancellationToken = default);

    /// <summary>Client-triggered refresh after purchase (webhook may still be in flight).</summary>
    Task<SubscriptionSnapshotDto> RefreshFromClientHintAsync(
        string userId,
        ClientSubscriptionHintDto? hint,
        CancellationToken cancellationToken = default);
}

/// <summary>Normalized RevenueCat webhook payload used by the application layer.</summary>
public class RevenueCatWebhookEventDto
{
    public string EventId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string AppUserId { get; set; } = string.Empty;
    public string? ProductId { get; set; }
    public string? Store { get; set; }
    public DateTime? ExpirationAt { get; set; }
    public bool? WillRenew { get; set; }
    public bool EntitlementActive { get; set; }
    public DateTime EventTimestamp { get; set; } = DateTime.UtcNow;
    public string? EntitlementId { get; set; }
}

public class ClientSubscriptionHintDto
{
    public bool? EntitlementActive { get; set; }
    public string? ProductId { get; set; }
    public string? Store { get; set; }
    public DateTime? ExpirationAt { get; set; }
    public bool? WillRenew { get; set; }
}
