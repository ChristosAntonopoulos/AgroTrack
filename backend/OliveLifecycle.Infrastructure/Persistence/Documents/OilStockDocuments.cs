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

public class OilCellarDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerPersonId")]
    public string OwnerPersonId { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("status")]
    public string Status { get; set; } = "active";

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class OilProvenanceEntryDocument
{
    [BsonElement("fieldId")]
    public string FieldId { get; set; } = string.Empty;

    [BsonElement("share")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal Share { get; set; }
}

public class OilLotDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    // Missing on pre-cellar documents; the unique (cellarId, batchId) index is partial for that reason.
    [BsonElement("cellarId")]
    [BsonIgnoreIfNull]
    public string? CellarId { get; set; }

    [BsonElement("ownerUserId")]
    public string OwnerUserId { get; set; } = string.Empty;

    [BsonElement("batchId")]
    public string BatchId { get; set; } = string.Empty;

    [BsonElement("sourcePressingId")]
    [BsonIgnoreIfNull]
    public string? SourcePressingId { get; set; }

    [BsonElement("provenance")]
    [BsonIgnoreIfNull]
    public List<OilProvenanceEntryDocument>? Provenance { get; set; }

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

    [BsonElement("cellarId")]
    [BsonIgnoreIfNull]
    public string? CellarId { get; set; }

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

public class OilShareRequestDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("fromCellarId")]
    [BsonIgnoreIfNull]
    public string? FromCellarId { get; set; }

    [BsonElement("toCellarId")]
    [BsonIgnoreIfNull]
    public string? ToCellarId { get; set; }

    [BsonElement("fromOwnerUserId")]
    public string FromOwnerUserId { get; set; } = string.Empty;

    [BsonElement("toUserId")]
    public string ToUserId { get; set; } = string.Empty;

    [BsonElement("fromDisplayName")]
    public string FromDisplayName { get; set; } = string.Empty;

    [BsonElement("toDisplayName")]
    public string ToDisplayName { get; set; } = string.Empty;

    [BsonElement("requested")]
    public OilPackDocument Requested { get; set; } = new();

    [BsonElement("fieldIds")]
    public List<string> FieldIds { get; set; } = [];

    [BsonElement("notes")]
    [BsonIgnoreIfNull]
    public string? Notes { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "pending";

    [BsonElement("resultLotId")]
    [BsonIgnoreIfNull]
    public string? ResultLotId { get; set; }

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

    [BsonElement("cellarId")]
    [BsonIgnoreIfNull]
    public string? CellarId { get; set; }

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

    [BsonElement("transferId")]
    [BsonIgnoreIfNull]
    public string? TransferId { get; set; }

    [BsonElement("reversalOfMovementId")]
    [BsonIgnoreIfNull]
    public string? ReversalOfMovementId { get; set; }

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

public class PressingAllocationDocument
{
    [BsonElement("pressingId")]
    public string PressingId { get; set; } = string.Empty;

    [BsonElement("cellarId")]
    public string CellarId { get; set; } = string.Empty;

    [BsonElement("litres")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal Litres { get; set; }

    [BsonElement("allocatedBy")]
    public string AllocatedBy { get; set; } = string.Empty;

    [BsonElement("allocatedAt")]
    public DateTime AllocatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("oilLotId")]
    [BsonIgnoreIfNull]
    public string? OilLotId { get; set; }
}

public class OilPressingDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("campaignId")]
    [BsonIgnoreIfNull]
    public string? CampaignId { get; set; }

    [BsonElement("batchId")]
    public string BatchId { get; set; } = string.Empty;

    [BsonElement("pressedOn")]
    public DateTime PressedOn { get; set; } = DateTime.UtcNow;

    [BsonElement("resultYear")]
    public int ResultYear { get; set; }

    [BsonElement("totalLitres")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal TotalLitres { get; set; }

    [BsonElement("unit")]
    public string Unit { get; set; } = "litres";

    [BsonElement("millKept")]
    [BsonRepresentation(BsonType.Decimal128)]
    public decimal MillKept { get; set; }

    [BsonElement("conversionFactor")]
    [BsonRepresentation(BsonType.Decimal128)]
    [BsonIgnoreIfNull]
    public decimal? ConversionFactor { get; set; }

    [BsonElement("fieldIds")]
    public List<string> FieldIds { get; set; } = [];

    [BsonElement("provenance")]
    [BsonIgnoreIfNull]
    public List<OilProvenanceEntryDocument>? Provenance { get; set; }

    [BsonElement("recordedByUserId")]
    public string RecordedByUserId { get; set; } = string.Empty;

    [BsonElement("status")]
    public string Status { get; set; } = "confirmed";

    [BsonElement("harvestRecordIds")]
    public List<string> HarvestRecordIds { get; set; } = [];

    [BsonElement("notes")]
    [BsonIgnoreIfNull]
    public string? Notes { get; set; }

    [BsonElement("allocations")]
    public List<PressingAllocationDocument> Allocations { get; set; } = [];

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
