using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Local subscription snapshot for authorization and UI.
/// Payment card details are never stored here.
/// </summary>
public class BillingProfile : BaseEntity
{
    public string UserId { get; set; } = string.Empty;

    public PlanCode PlanCode { get; set; } = PlanCode.Free;

    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;

    public BillingProvider Provider { get; set; } = BillingProvider.None;

    public string? ProductId { get; set; }

    public DateTime? CurrentPeriodEndsAt { get; set; }

    public bool WillRenew { get; set; }

    /// <summary>True when the RevenueCat <c>pro</c> entitlement is currently active (incl. grace).</summary>
    public bool EntitlementActive { get; set; }

    public DateTime? LastRevenueCatEventAt { get; set; }

    /// <summary>
    /// When Pro expires while owning more than the Free limit, the single grove the user
    /// may continue writing. Null means selection is still required (all owned groves read-only for writes).
    /// </summary>
    public string? SelectedWritableFieldId { get; set; }

    public DateTime? SelectedWritableFieldIdChangedAt { get; set; }

    /// <summary>True when the user must pick which owned grove stays writable after downgrade.</summary>
    public bool NeedsWritableFieldSelection { get; set; }

    /// <summary>Short-lived mutex to reduce concurrent Free-tier field creation races.</summary>
    public DateTime? FieldCreationLockUntil { get; set; }
}
