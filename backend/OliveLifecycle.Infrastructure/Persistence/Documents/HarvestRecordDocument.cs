using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class HarvestRecordDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("fieldId")]
    public string FieldId { get; set; } = string.Empty;

    [BsonElement("ownerId")]
    public string OwnerId { get; set; } = string.Empty;

    [BsonElement("harvestDate")]
    public DateTime HarvestDate { get; set; } = DateTime.UtcNow;

    [BsonElement("resultYear")]
    public int ResultYear { get; set; }

    [BsonElement("harvestMethod")]
    public string HarvestMethod { get; set; } = string.Empty;

    [BsonElement("workersUsed")]
    public int WorkersUsed { get; set; }

    [BsonElement("oliveKg")]
    public double OliveKg { get; set; }

    [BsonElement("millName")]
    public string? MillName { get; set; }

    [BsonElement("oilKg")]
    public double? OilKg { get; set; }

    [BsonElement("oilLitres")]
    [BsonRepresentation(BsonType.Decimal128)]
    [BsonIgnoreIfNull]
    public decimal? OilLitres { get; set; }

    [BsonElement("conversionFactor")]
    [BsonRepresentation(BsonType.Decimal128)]
    [BsonIgnoreIfNull]
    public decimal? ConversionFactor { get; set; }

    [BsonElement("conversionSource")]
    public string? ConversionSource { get; set; }

    [BsonElement("conversionRecordedAt")]
    public DateTime? ConversionRecordedAt { get; set; }

    [BsonElement("oilYieldPercent")]
    public double? OilYieldPercent { get; set; }

    [BsonElement("qualityGrade")]
    public string QualityGrade { get; set; } = string.Empty;

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "posted";

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
