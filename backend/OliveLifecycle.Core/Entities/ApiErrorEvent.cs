namespace OliveLifecycle.Core.Entities;

/// <summary>Persisted unexpected API failure (5xx) for the admin ops console.</summary>
public class ApiErrorEvent : BaseEntity
{
    public DateTime OccurredAt { get; set; }
    public string Method { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public string ErrorCode { get; set; } = "internal_error";
    public string ExceptionType { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? StackTrace { get; set; }
    public string? UserId { get; set; }
    public string? RequestId { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
}
