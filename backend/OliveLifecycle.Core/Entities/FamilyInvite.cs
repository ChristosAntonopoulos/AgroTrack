using OliveLifecycle.Core;

namespace OliveLifecycle.Core.Entities;

public class FamilyInvite : BaseEntity
{
    public string Token { get; set; } = string.Empty;
    /// <summary>Short code for registration (8 characters, no ambiguous glyphs).</summary>
    public string Code { get; set; } = string.Empty;
    public string CircleId { get; set; } = string.Empty;
    public string MemberId { get; set; } = string.Empty;
    public string OwnerUserId { get; set; } = string.Empty;
    public string InvitedBy { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = FamilyAccessLevels.View;
    public string Status { get; set; } = FamilyInviteStatuses.Pending;
    public DateTime ExpiresAt { get; set; }
    public string? AcceptedBy { get; set; }
}
