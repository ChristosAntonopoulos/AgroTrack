namespace OliveLifecycle.Core.Entities;

public class FieldMembership
{
    public string UserId { get; set; } = string.Empty;
    public List<string> Capacities { get; set; } = new();
    public string Status { get; set; } = "active";
    public string? InvitedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
