namespace OliveLifecycle.Core.Enums;

/// <summary>Subscription lifecycle status, separate from <see cref="PlanCode"/>.</summary>
public enum SubscriptionStatus
{
    Active = 0,
    GracePeriod = 1,
    BillingIssue = 2,
    CancelAtPeriodEnd = 3,
    Expired = 4
}
