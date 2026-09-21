namespace OliveLifecycle.Core.Entities;

/// <summary>In-app note from a signed-in user: comment, screenshot, and/or photo.</summary>
public class UserFeedback : BaseEntity
{
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
}
