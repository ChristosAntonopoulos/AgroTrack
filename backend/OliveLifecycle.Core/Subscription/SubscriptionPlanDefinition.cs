using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Subscription;

/// <summary>Central plan definition. Owned-field limits must not be scattered as magic numbers.</summary>
public sealed class SubscriptionPlanDefinition
{
    public required PlanCode Code { get; init; }
    public required int OwnedFieldLimit { get; init; }
    public string EntitlementId { get; init; } = string.Empty;

    public static SubscriptionPlanDefinition Free(int ownedFieldLimit = 1) => new()
    {
        Code = PlanCode.Free,
        OwnedFieldLimit = ownedFieldLimit,
        EntitlementId = string.Empty
    };

    public static SubscriptionPlanDefinition Pro(int ownedFieldLimit, string entitlementId = "pro") => new()
    {
        Code = PlanCode.Pro,
        OwnedFieldLimit = ownedFieldLimit,
        EntitlementId = entitlementId
    };
}
