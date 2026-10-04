using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class UserFeedbackDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("userEmail")]
    public string? UserEmail { get; set; }

    [BsonElement("userName")]
    public string? UserName { get; set; }

    [BsonElement("role")]
    public string Role { get; set; } = string.Empty;

    [BsonElement("comment")]
    public string Comment { get; set; } = string.Empty;

    [BsonElement("pageUrl")]
    public string? PageUrl { get; set; }

    [BsonElement("userAgent")]
    public string? UserAgent { get; set; }

    [BsonElement("screenshotUrl")]
    public string? ScreenshotUrl { get; set; }

    [BsonElement("photoUrl")]
    public string? PhotoUrl { get; set; }

    [BsonElement("seenAt")]
    public DateTime? SeenAt { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
