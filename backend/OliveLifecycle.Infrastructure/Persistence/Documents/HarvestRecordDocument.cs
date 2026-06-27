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

    [BsonElement("oilYieldPercent")]
    public double? OilYieldPercent { get; set; }

    [BsonElement("qualityGrade")]
    public string QualityGrade { get; set; } = string.Empty;

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
