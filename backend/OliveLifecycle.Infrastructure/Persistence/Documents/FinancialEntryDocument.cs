using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class FinancialEntryDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("fieldId")]
    public string FieldId { get; set; } = string.Empty;

    [BsonElement("lifecycleYear")]
    public string LifecycleYear { get; set; } = "low";

    [BsonElement("taskId")]
    public string? TaskId { get; set; }

    [BsonElement("harvestId")]
    public string? HarvestId { get; set; }

    [BsonElement("kind")]
    public string Kind { get; set; } = "expense";

    [BsonElement("amount")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal Amount { get; set; }

    [BsonElement("currency")]
    public string Currency { get; set; } = "EUR";

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("bucket")]
    public string? Bucket { get; set; }

    [BsonElement("category")]
    public string? Category { get; set; }

    [BsonElement("quantity")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal? Quantity { get; set; }

    [BsonElement("unit")]
    public string? Unit { get; set; }

    [BsonElement("unitPrice")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal? UnitPrice { get; set; }

    [BsonElement("occurredOn")]
    public DateTime OccurredOn { get; set; } = DateTime.UtcNow;

    [BsonElement("status")]
    public string Status { get; set; } = "posted";

    [BsonElement("recordedBy")]
    public string RecordedBy { get; set; } = string.Empty;

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("voidReason")]
    public string? VoidReason { get; set; }

    [BsonElement("voidedAt")]
    public DateTime? VoidedAt { get; set; }

    [BsonElement("voidedBy")]
    public string? VoidedBy { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
