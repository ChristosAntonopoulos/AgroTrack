using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class FinancialTransactionDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerUserId")]
    public string OwnerUserId { get; set; } = string.Empty;

    [BsonElement("type")]
    public string Type { get; set; } = "expense";

    [BsonElement("status")]
    public string Status { get; set; } = "draft";

    [BsonElement("amount")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal Amount { get; set; }

    [BsonElement("currency")]
    public string Currency { get; set; } = "EUR";

    [BsonElement("occurredOn")]
    public DateTime OccurredOn { get; set; } = DateTime.UtcNow;

    [BsonElement("resultYear")]
    public int ResultYear { get; set; }

    [BsonElement("fieldId")]
    public string? FieldId { get; set; }

    [BsonElement("category")]
    public string? Category { get; set; }

    [BsonElement("productKind")]
    public string? ProductKind { get; set; }

    [BsonElement("quantity")]
    [BsonRepresentation(BsonType.Decimal128)]
    [BsonIgnoreIfNull]
    public decimal? Quantity { get; set; }

    [BsonElement("quantityUnit")]
    public string? QuantityUnit { get; set; }

    [BsonElement("unitPrice")]
    [BsonRepresentation(BsonType.Decimal128)]
    [BsonIgnoreIfNull]
    public decimal? UnitPrice { get; set; }

    [BsonElement("calculationMode")]
    public string CalculationMode { get; set; } = "total_only";

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("paymentMethod")]
    public string? PaymentMethod { get; set; }

    [BsonElement("counterpartyName")]
    public string? CounterpartyName { get; set; }

    [BsonElement("relatedTaskId")]
    public string? RelatedTaskId { get; set; }

    [BsonElement("relatedHarvestId")]
    public string? RelatedHarvestId { get; set; }

    [BsonElement("relatedCollaboratorId")]
    public string? RelatedCollaboratorId { get; set; }

    [BsonElement("sourceType")]
    public string SourceType { get; set; } = "manual";

    [BsonElement("sourceId")]
    public string? SourceId { get; set; }

    [BsonElement("attachmentIds")]
    public List<string> AttachmentIds { get; set; } = [];

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("idempotencyKey")]
    public string IdempotencyKey { get; set; } = string.Empty;

    [BsonElement("createdByUserId")]
    public string CreatedByUserId { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("postedAt")]
    public DateTime? PostedAt { get; set; }

    [BsonElement("voidedAt")]
    public DateTime? VoidedAt { get; set; }

    [BsonElement("voidReason")]
    public string? VoidReason { get; set; }

    [BsonElement("voidedByUserId")]
    public string? VoidedByUserId { get; set; }
}
