using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class FamilyMemberDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("circleId")]
    public string CircleId { get; set; } = string.Empty;

    [BsonElement("ownerUserId")]
    public string OwnerUserId { get; set; } = string.Empty;

    [BsonElement("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [BsonElement("phone")]
    public string? Phone { get; set; }

    [BsonElement("email")]
    public string? Email { get; set; }

    [BsonElement("linkedUserId")]
    public string? LinkedUserId { get; set; }

    [BsonElement("modules")]
    public List<string> Modules { get; set; } = new();

    [BsonElement("accessLevel")]
    public string AccessLevel { get; set; } = "view";

    [BsonElement("status")]
    public string Status { get; set; } = "pending";

    [BsonElement("inviteId")]
    public string? InviteId { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
