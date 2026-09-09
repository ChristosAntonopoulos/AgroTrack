using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class TaskTemplateDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("type")]
    public string Type { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("lifecycleYear")]
    public string LifecycleYear { get; set; } = "low";

    [BsonElement("harvestPhase")]
    [BsonIgnoreIfNull]
    public string? HarvestPhase { get; set; }

    [BsonElement("defaultSchedulingWindow")]
    public SchedulingWindowDocument? DefaultSchedulingWindow { get; set; }

    [BsonElement("serviceCategorySlug")]
    [BsonIgnoreIfNull]
    public string? ServiceCategorySlug { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class SchedulingWindowDocument
{
    [BsonElement("startMonth")]
    public int StartMonth { get; set; }

    [BsonElement("startDay")]
    public int StartDay { get; set; }

    [BsonElement("endMonth")]
    public int EndMonth { get; set; }

    [BsonElement("endDay")]
    public int EndDay { get; set; }
}
