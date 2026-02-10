using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Core.Entities;

public class Lifecycle
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("fieldId")]
    public string FieldId { get; set; } = string.Empty;

    [BsonElement("currentYear")]
    public string CurrentYear { get; set; } = "low";

    [BsonElement("cycleStartDate")]
    public DateTime CycleStartDate { get; set; } = DateTime.UtcNow;

    [BsonElement("lastProgressionDate")]
    public DateTime? LastProgressionDate { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
