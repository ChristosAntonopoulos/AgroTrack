using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class ProcessedBillingEventDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("providerEventId")]
    public string ProviderEventId { get; set; } = string.Empty;

    [BsonElement("provider")]
    public string Provider { get; set; } = "revenuecat";

    [BsonElement("eventType")]
    public string? EventType { get; set; }

    [BsonElement("appUserId")]
    public string? AppUserId { get; set; }

    [BsonElement("processedAt")]
    public DateTime ProcessedAt { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
