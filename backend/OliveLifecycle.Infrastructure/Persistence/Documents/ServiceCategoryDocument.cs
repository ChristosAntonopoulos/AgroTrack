using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class ServiceCategoryDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("slug")]
    public string Slug { get; set; } = string.Empty;

    [BsonElement("nameEl")]
    public string NameEl { get; set; } = string.Empty;

    [BsonElement("nameEn")]
    public string NameEn { get; set; } = string.Empty;

    [BsonElement("nameIt")]
    public string NameIt { get; set; } = string.Empty;

    [BsonElement("descriptionEl")]
    public string? DescriptionEl { get; set; }

    [BsonElement("descriptionEn")]
    public string? DescriptionEn { get; set; }

    [BsonElement("descriptionIt")]
    public string? DescriptionIt { get; set; }

    [BsonElement("icon")]
    public string Icon { get; set; } = "handshake";

    [BsonElement("parentCategoryId")]
    [BsonIgnoreIfNull]
    public string? ParentCategoryId { get; set; }

    [BsonElement("sortOrder")]
    public int SortOrder { get; set; }

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("isProminent")]
    public bool IsProminent { get; set; }

    [BsonElement("suggestedTaskTypes")]
    public List<string> SuggestedTaskTypes { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
