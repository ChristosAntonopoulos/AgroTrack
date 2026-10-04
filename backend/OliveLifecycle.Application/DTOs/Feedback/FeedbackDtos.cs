namespace OliveLifecycle.Application.DTOs.Feedback;

public sealed class SubmitFeedbackRequest
{
    public string? Comment { get; set; }
    public string? PageUrl { get; set; }
    public string? UserAgent { get; set; }
    public FeedbackFile? Screenshot { get; set; }
    public FeedbackFile? Photo { get; set; }
}

public sealed class FeedbackFile
{
    public required Stream Content { get; init; }
    public required string FileName { get; init; }
    public required string ContentType { get; init; }
}

public sealed class FeedbackSubmittedDto
{
    public string Id { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
