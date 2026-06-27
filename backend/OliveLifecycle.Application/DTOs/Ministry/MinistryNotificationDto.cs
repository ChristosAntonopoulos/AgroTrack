namespace OliveLifecycle.Application.DTOs.Ministry;

public class MinistryNotificationDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public bool Read { get; set; }
    public string? ActionUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public List<string> TargetRoles { get; set; } = new();
}
