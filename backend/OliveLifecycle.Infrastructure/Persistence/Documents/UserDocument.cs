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

    [BsonElement("passwordResetTokenHash")]
    public string? PasswordResetTokenHash { get; set; }

    [BsonElement("passwordResetExpiresAt")]
    public DateTime? PasswordResetExpiresAt { get; set; }

    [BsonElement("pendingEmail")]
    public string? PendingEmail { get; set; }

    [BsonElement("emailChangeTokenHash")]
    public string? EmailChangeTokenHash { get; set; }

    [BsonElement("emailChangeExpiresAt")]
    public DateTime? EmailChangeExpiresAt { get; set; }

    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("lastLoginAt")]
    public DateTime? LastLoginAt { get; set; }

    [BsonElement("lastSeenAt")]
    public DateTime? LastSeenAt { get; set; }

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

    [BsonElement("notifications")]
    public NotificationPreferencesDocument? Notifications { get; set; }
}

public class NotificationPreferencesDocument
{
    [BsonElement("taskAssignment")]
    public bool TaskAssignment { get; set; } = true;

    [BsonElement("approval")]
    public bool Approval { get; set; } = true;

    [BsonElement("harvest")]
    public bool Harvest { get; set; } = true;

    [BsonElement("financial")]
    public bool Financial { get; set; } = true;

    [BsonElement("satelliteWeather")]
    public bool SatelliteWeather { get; set; } = true;

    [BsonElement("marketingSystem")]
    public bool MarketingSystem { get; set; } = true;
}
