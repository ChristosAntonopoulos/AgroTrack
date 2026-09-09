using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class ServiceProviderProfileDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [BsonElement("photoUrl")]
    public string? PhotoUrl { get; set; }

    [BsonElement("businessName")]
    public string? BusinessName { get; set; }

    [BsonElement("providerKind")]
    public string ProviderKind { get; set; } = "Individual";

    [BsonElement("serviceCategoryIds")]
    public List<string> ServiceCategoryIds { get; set; } = new();

    [BsonElement("baseLocation")]
    public GeoJsonPointDocument? BaseLocation { get; set; }

    [BsonElement("baseAreaLabel")]
    public string? BaseAreaLabel { get; set; }

    [BsonElement("serviceRadiusKm")]
    public int ServiceRadiusKm { get; set; } = 50;

    [BsonElement("serviceAreas")]
    public List<string> ServiceAreas { get; set; } = new();

    [BsonElement("shortDescription")]
    public string ShortDescription { get; set; } = string.Empty;

    [BsonElement("experienceYears")]
    public int? ExperienceYears { get; set; }

    [BsonElement("crewSize")]
    public int? CrewSize { get; set; }

    [BsonElement("equipment")]
    public string? Equipment { get; set; }

    [BsonElement("millOperatingPeriod")]
    public string? MillOperatingPeriod { get; set; }

    [BsonElement("millProcessingMethod")]
    public string? MillProcessingMethod { get; set; }

    [BsonElement("millOrganic")]
    public bool? MillOrganic { get; set; }

    [BsonElement("millAppointmentRequired")]
    public bool? MillAppointmentRequired { get; set; }

    [BsonElement("languages")]
    public List<string> Languages { get; set; } = new();

    [BsonElement("certifications")]
    public List<string> Certifications { get; set; } = new();

    [BsonElement("contactPreference")]
    public string ContactPreference { get; set; } = "InApp";

    [BsonElement("showPhone")]
    public bool ShowPhone { get; set; }

    [BsonElement("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [BsonElement("availability")]
    public string Availability { get; set; } = "Available";

    [BsonElement("availableFrom")]
    public DateTime? AvailableFrom { get; set; }

    [BsonElement("availableUntil")]
    public DateTime? AvailableUntil { get; set; }

    [BsonElement("isPaused")]
    public bool IsPaused { get; set; }

    [BsonElement("verificationStatus")]
    public string VerificationStatus { get; set; } = "Unverified";

    [BsonElement("pricingNote")]
    public string? PricingNote { get; set; }

    [BsonElement("isListed")]
    public bool IsListed { get; set; }

    [BsonElement("completenessScore")]
    public int CompletenessScore { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
