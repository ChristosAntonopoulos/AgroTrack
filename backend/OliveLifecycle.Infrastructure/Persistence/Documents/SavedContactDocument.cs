using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class SavedContactDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerUserId")]
    public string OwnerUserId { get; set; } = string.Empty;

    [BsonElement("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [BsonElement("phone")]
    public string? Phone { get; set; }

    [BsonElement("email")]
    public string? Email { get; set; }

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("serviceCategoryIds")]
    public List<string> ServiceCategoryIds { get; set; } = new();

    [BsonElement("fieldIds")]
    public List<string> FieldIds { get; set; } = new();

    [BsonElement("linkedUserId")]
    public string? LinkedUserId { get; set; }

    [BsonElement("source")]
    public string Source { get; set; } = "Manual";

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
