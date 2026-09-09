using OliveLifecycle.Core;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Extra family seat on a circle. Pending invites occupy a seat until accepted, expired, or revoked.
/// </summary>
public class FamilyMember : BaseEntity
{
    public string CircleId { get; set; } = string.Empty;
    public string OwnerUserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? LinkedUserId { get; set; }
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = FamilyAccessLevels.View;
    public string Status { get; set; } = FamilyMemberStatuses.Pending;
    public string? InviteId { get; set; }
}
