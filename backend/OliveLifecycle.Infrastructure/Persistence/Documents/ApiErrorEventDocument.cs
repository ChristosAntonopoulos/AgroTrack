using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class ApiErrorEventDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("occurredAt")]
    public DateTime OccurredAt { get; set; }

    [BsonElement("method")]
    public string Method { get; set; } = string.Empty;

    [BsonElement("path")]
    public string Path { get; set; } = string.Empty;

    [BsonElement("statusCode")]
    public int StatusCode { get; set; }

    [BsonElement("errorCode")]
    public string ErrorCode { get; set; } = "internal_error";

    [BsonElement("exceptionType")]
    public string ExceptionType { get; set; } = string.Empty;

    [BsonElement("message")]
    public string Message { get; set; } = string.Empty;

    [BsonElement("stackTrace")]
    public string? StackTrace { get; set; }

    [BsonElement("userId")]
    public string? UserId { get; set; }

    [BsonElement("requestId")]
    public string? RequestId { get; set; }

    [BsonElement("acknowledgedAt")]
    public DateTime? AcknowledgedAt { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
