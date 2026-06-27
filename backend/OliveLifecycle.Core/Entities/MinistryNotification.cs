namespace OliveLifecycle.Core.Entities;

public class MinistryNotification : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "alert";
    public string Priority { get; set; } = "medium";
    public DateTime PublishedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpirationDate { get; set; }
    public string Category { get; set; } = string.Empty;
    public List<string> TargetRoles { get; set; } = new();
    public string? ActionUrl { get; set; }
}

public class MinistryNotificationRead : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string NotificationId { get; set; } = string.Empty;
}
