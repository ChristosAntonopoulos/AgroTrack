using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class OilPackDocument
{
    [BsonElement("tin16")]
    public int Tin16 { get; set; }

    [BsonElement("tin17")]
    public int Tin17 { get; set; }

    [BsonElement("bulkLitres")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal BulkLitres { get; set; }
}

public class OilLotDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerUserId")]
    public string OwnerUserId { get; set; } = string.Empty;

    [BsonElement("batchId")]
    public string BatchId { get; set; } = string.Empty;

    [BsonElement("pressedOn")]
    public DateTime PressedOn { get; set; } = DateTime.UtcNow;

    [BsonElement("resultYear")]
    public int ResultYear { get; set; }

    [BsonElement("harvestRecordIds")]
    public List<string> HarvestRecordIds { get; set; } = [];

    [BsonElement("fieldIds")]
    public List<string> FieldIds { get; set; } = [];

    [BsonElement("totalAmount")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal TotalAmount { get; set; }

    [BsonElement("unit")]
    public string Unit { get; set; } = "litres";

    [BsonElement("millKept")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal MillKept { get; set; }

    [BsonElement("conversionFactor")]
    [BsonRepresentation(BsonType.Decimal128)]
    [BsonIgnoreIfNull]
    public decimal? ConversionFactor { get; set; }

    [BsonElement("packing")]
    public OilPackDocument Packing { get; set; } = new();

    [BsonElement("notes")]
    [BsonIgnoreIfNull]
    public string? Notes { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class OilLotAllocationDocument
{
    [BsonElement("oilLotId")]
    public string OilLotId { get; set; } = string.Empty;

    [BsonElement("pack")]
    public OilPackDocument Pack { get; set; } = new();
}

public class OilCommitmentDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerUserId")]
    public string OwnerUserId { get; set; } = string.Empty;

    [BsonElement("contactId")]
    [BsonIgnoreIfNull]
    public string? ContactId { get; set; }

    [BsonElement("counterpartyName")]
    public string CounterpartyName { get; set; } = string.Empty;

    [BsonElement("requested")]
    public OilPackDocument Requested { get; set; } = new();

    [BsonElement("delivered")]
    public OilPackDocument Delivered { get; set; } = new();

    [BsonElement("isSale")]
    public bool IsSale { get; set; }

    [BsonElement("amount")]
    [BsonRepresentation(BsonType.Decimal128)]
    [BsonIgnoreIfNull]
    public decimal? Amount { get; set; }

    [BsonElement("currency")]
    public string Currency { get; set; } = "EUR";

    [BsonElement("financialTransactionId")]
    [BsonIgnoreIfNull]
    public string? FinancialTransactionId { get; set; }

    [BsonElement("allocations")]
    public List<OilLotAllocationDocument> Allocations { get; set; } = [];

    [BsonElement("promisedFor")]
    [BsonIgnoreIfNull]
    public DateTime? PromisedFor { get; set; }

    [BsonElement("notes")]
    [BsonIgnoreIfNull]
    public string? Notes { get; set; }

    [BsonElement("cancelled")]
    public bool Cancelled { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class StockMovementDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerUserId")]
    public string OwnerUserId { get; set; } = string.Empty;

    [BsonElement("oilLotId")]
    [BsonIgnoreIfNull]
    public string? OilLotId { get; set; }

    [BsonElement("oilCommitmentId")]
    [BsonIgnoreIfNull]
    public string? OilCommitmentId { get; set; }

    [BsonElement("kind")]
    public string Kind { get; set; } = string.Empty;

    [BsonElement("packDelta")]
    public OilPackDocument PackDelta { get; set; } = new();

    [BsonElement("litresDelta")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal LitresDelta { get; set; }

    [BsonElement("notes")]
    [BsonIgnoreIfNull]
    public string? Notes { get; set; }

    [BsonElement("occurredOn")]
    public DateTime OccurredOn { get; set; } = DateTime.UtcNow;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
