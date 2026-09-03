namespace OliveLifecycle.Core.Entities;

public class FieldInvite : BaseEntity
{
    public string Token { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string InvitedBy { get; set; } = string.Empty;
    public List<string> Capacities { get; set; } = new();
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime ExpiresAt { get; set; }
    public string? AcceptedBy { get; set; }
}
