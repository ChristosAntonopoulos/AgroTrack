namespace OliveLifecycle.Core.Entities;

public class AdvisorComment
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string UserId { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
