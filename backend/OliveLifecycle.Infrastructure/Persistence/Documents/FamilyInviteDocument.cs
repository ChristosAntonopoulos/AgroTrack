using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class FamilyInviteDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("token")]
    public string Token { get; set; } = string.Empty;

    [BsonElement("code")]
    public string Code { get; set; } = string.Empty;

    [BsonElement("circleId")]
    public string CircleId { get; set; } = string.Empty;

    [BsonElement("memberId")]
    public string MemberId { get; set; } = string.Empty;

    [BsonElement("ownerUserId")]
    public string OwnerUserId { get; set; } = string.Empty;

    [BsonElement("invitedBy")]
    public string InvitedBy { get; set; } = string.Empty;

    [BsonElement("displayName")]
    public string? DisplayName { get; set; }

    [BsonElement("phone")]
    public string? Phone { get; set; }

    [BsonElement("email")]
    public string? Email { get; set; }

    [BsonElement("modules")]
    public List<string> Modules { get; set; } = new();

    [BsonElement("accessLevel")]
    public string AccessLevel { get; set; } = "view";

    [BsonElement("status")]
    public string Status { get; set; } = "pending";

    [BsonElement("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    [BsonElement("acceptedBy")]
    public string? AcceptedBy { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
