using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Core.Entities;

public class TaskTemplate
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

    [BsonElement("defaultSchedulingWindow")]
    public SchedulingWindow? DefaultSchedulingWindow { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SchedulingWindow
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
