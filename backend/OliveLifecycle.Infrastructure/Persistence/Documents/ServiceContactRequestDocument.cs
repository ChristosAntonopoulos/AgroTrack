using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class ServiceContactRequestDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("requesterUserId")]
    public string RequesterUserId { get; set; } = string.Empty;

    [BsonElement("providerUserId")]
    public string ProviderUserId { get; set; } = string.Empty;

    [BsonElement("serviceCategoryId")]
    public string ServiceCategoryId { get; set; } = string.Empty;

    [BsonElement("fieldId")]
    public string? FieldId { get; set; }

    [BsonElement("taskId")]
    public string? TaskId { get; set; }

    [BsonElement("approximateArea")]
    public string ApproximateArea { get; set; } = string.Empty;

    [BsonElement("areaHectares")]
    public double? AreaHectares { get; set; }

    [BsonElement("suggestedStart")]
    public DateTime? SuggestedStart { get; set; }

    [BsonElement("suggestedEnd")]
    public DateTime? SuggestedEnd { get; set; }

    [BsonElement("message")]
    public string Message { get; set; } = string.Empty;

    [BsonElement("status")]
    public string Status { get; set; } = "New";

    [BsonElement("contactMethod")]
    public string ContactMethod { get; set; } = "in_app";

    [BsonElement("viewedAt")]
    public DateTime? ViewedAt { get; set; }

    [BsonElement("respondedAt")]
    public DateTime? RespondedAt { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
