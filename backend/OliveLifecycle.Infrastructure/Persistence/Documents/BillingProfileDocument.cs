using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class BillingProfileDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("planCode")]
    [BsonRepresentation(BsonType.String)]
    public PlanCode PlanCode { get; set; } = PlanCode.Free;

    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;

    [BsonElement("provider")]
    [BsonRepresentation(BsonType.String)]
    public BillingProvider Provider { get; set; } = BillingProvider.None;

    [BsonElement("productId")]
    public string? ProductId { get; set; }

    [BsonElement("currentPeriodEndsAt")]
    public DateTime? CurrentPeriodEndsAt { get; set; }

    [BsonElement("willRenew")]
    public bool WillRenew { get; set; }

    [BsonElement("entitlementActive")]
    public bool EntitlementActive { get; set; }

    [BsonElement("lastRevenueCatEventAt")]
    public DateTime? LastRevenueCatEventAt { get; set; }

    [BsonElement("selectedWritableFieldId")]
    public string? SelectedWritableFieldId { get; set; }

    [BsonElement("selectedWritableFieldIdChangedAt")]
    public DateTime? SelectedWritableFieldIdChangedAt { get; set; }

    [BsonElement("needsWritableFieldSelection")]
    public bool NeedsWritableFieldSelection { get; set; }

    [BsonElement("fieldCreationLockUntil")]
    public DateTime? FieldCreationLockUntil { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
