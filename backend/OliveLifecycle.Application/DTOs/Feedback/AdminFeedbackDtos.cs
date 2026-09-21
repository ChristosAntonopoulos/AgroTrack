namespace OliveLifecycle.Application.DTOs.Feedback;

public sealed class AdminFeedbackListItemDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string? UserEmail { get; set; }
    public string? UserName { get; set; }
    public string Role { get; set; } = string.Empty;
    public string CommentExcerpt { get; set; } = string.Empty;
    public string? PageUrl { get; set; }
    public bool HasScreenshot { get; set; }
    public bool HasPhoto { get; set; }
    public DateTime? SeenAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class AdminFeedbackDetailDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string? UserEmail { get; set; }
    public string? UserName { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Comment { get; set; } = string.Empty;
    public string? PageUrl { get; set; }
    public string? UserAgent { get; set; }
    public string? ScreenshotUrl { get; set; }
    public string? PhotoUrl { get; set; }
    public DateTime? SeenAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class AdminFeedbackPageDto
{
    public IReadOnlyList<AdminFeedbackListItemDto> Items { get; set; } = Array.Empty<AdminFeedbackListItemDto>();
    public int Total { get; set; }
    public int UnseenCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
