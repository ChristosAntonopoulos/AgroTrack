namespace OliveLifecycle.Application.DTOs.Subscription;

/// <summary>Stable The Olive Lot subscription DTO for clients. Not a RevenueCat object dump.</summary>
public class SubscriptionSnapshotDto
{
    public string Plan { get; set; } = "free";
    public string Status { get; set; } = "active";
    public bool EntitlementActive { get; set; }
    public SubscriptionLimitsDto Limits { get; set; } = new();
    public SubscriptionUsageDto Usage { get; set; } = new();
    public string? Provider { get; set; }
    public string? ProductId { get; set; }
    public DateTime? RenewsAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool WillRenew { get; set; }
    public bool CanCreateField { get; set; }
    public bool NeedsWritableFieldSelection { get; set; }
    public string? SelectedWritableFieldId { get; set; }
    public bool HasBillingIssue { get; set; }
}

public class SubscriptionLimitsDto
{
    public int OwnedFields { get; set; } = 1;
}

public class SubscriptionUsageDto
{
    public int OwnedFields { get; set; }
}

public class SelectWritableFieldDto
{
    public string FieldId { get; set; } = string.Empty;
}

public class OwnedFieldSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsWritable { get; set; }
}
