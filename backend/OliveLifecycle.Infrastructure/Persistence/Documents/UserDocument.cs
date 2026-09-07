using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class UserDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;

    [BsonElement("role")]
    public string Role { get; set; } = "Producer";

    [BsonElement("firstName")]
    public string? FirstName { get; set; }

    [BsonElement("lastName")]
    public string? LastName { get; set; }

    [BsonElement("preferences")]
    public UserExperiencePreferencesDocument Preferences { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class UserExperiencePreferencesDocument
{
    [BsonElement("experienceMode")]
    public string ExperienceMode { get; set; } = "everyday";

    [BsonElement("experienceModeChosen")]
    public bool ExperienceModeChosen { get; set; }

    [BsonElement("fontScale")]
    public string FontScale { get; set; } = "default";

    [BsonElement("largeControls")]
    public bool LargeControls { get; set; }

    [BsonElement("language")]
    public string Language { get; set; } = "en";
}
