using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class MediaAttachmentDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerType")]
    public string OwnerType { get; set; } = "field";

    [BsonElement("ownerId")]
    public string OwnerId { get; set; } = string.Empty;

    [BsonElement("fieldId")]
    public string FieldId { get; set; } = string.Empty;

    [BsonElement("mediaType")]
    public string MediaType { get; set; } = "image";

    [BsonElement("url")]
    public string Url { get; set; } = string.Empty;

    [BsonElement("thumbnailUrl")]
    public string? ThumbnailUrl { get; set; }

    [BsonElement("fileName")]
    public string? FileName { get; set; }

    [BsonElement("contentType")]
    public string? ContentType { get; set; }

    [BsonElement("uploadedByUserId")]
    public string UploadedByUserId { get; set; } = string.Empty;

    [BsonElement("capturedAt")]
    public DateTime? CapturedAt { get; set; }

    [BsonElement("latitude")]
    public double? Latitude { get; set; }

    [BsonElement("longitude")]
    public double? Longitude { get; set; }

    [BsonElement("fieldAssignment")]
    public string FieldAssignment { get; set; } = "unassigned";

    [BsonElement("fieldMatchScore")]
    public double? FieldMatchScore { get; set; }

    [BsonElement("kind")]
    public string Kind { get; set; } = "general";

    [BsonElement("contentHash")]
    public string? ContentHash { get; set; }

    [BsonElement("width")]
    public int? Width { get; set; }

    [BsonElement("height")]
    public int? Height { get; set; }

    [BsonElement("orientation")]
    public int? Orientation { get; set; }

    [BsonElement("byteSize")]
    public long? ByteSize { get; set; }

    [BsonElement("assignmentReason")]
    public string? AssignmentReason { get; set; }

    [BsonElement("caption")]
    public string? Caption { get; set; }

    [BsonElement("linkedTitle")]
    public string? LinkedTitle { get; set; }

    [BsonElement("linkedOccurredAt")]
    public DateTime? LinkedOccurredAt { get; set; }

    [BsonElement("linkedStatus")]
    public string? LinkedStatus { get; set; }

    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("deletedByUserId")]
    public string? DeletedByUserId { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
