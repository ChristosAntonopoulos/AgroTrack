using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Core.Entities;

public class Task
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("fieldId")]
    public string FieldId { get; set; } = string.Empty;

    [BsonElement("templateId")]
    public string? TemplateId { get; set; }

    [BsonElement("type")]
    public string Type { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("lifecycleYear")]
    public string LifecycleYear { get; set; } = "low";

    [BsonElement("assignedTo")]
    public string? AssignedTo { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "pending";

    [BsonElement("scheduledStart")]
    public DateTime? ScheduledStart { get; set; }

    [BsonElement("scheduledEnd")]
    public DateTime? ScheduledEnd { get; set; }

    [BsonElement("actualStart")]
    public DateTime? ActualStart { get; set; }

    [BsonElement("actualEnd")]
    public DateTime? ActualEnd { get; set; }

    [BsonElement("cost")]
    public decimal? Cost { get; set; }

    [BsonElement("evidence")]
    public List<Evidence> Evidence { get; set; } = new();

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Evidence
{
    [BsonElement("photoUrl")]
    public string? PhotoUrl { get; set; }

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
