using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// A seat on a field: Admin, Partner, or Family. Pending invites occupy a seat until accepted/expired/revoked.
/// </summary>
public class FieldPerson
{
    /// <summary>Linked user id after accept; may be empty while pending.</summary>
    public string UserId { get; set; } = string.Empty;

    public FieldPersonRole Role { get; set; }

    /// <summary>Module grants. Unused for Admin (implicit all modules).</summary>
    public List<string> Modules { get; set; } = new();

    /// <summary>view | help | work. Admin is always work.</summary>
    public string AccessLevel { get; set; } = FamilyAccessLevels.View;

    public string Status { get; set; } = FamilyMemberStatuses.Active;

    public string? InviteId { get; set; }
    public string? InvitedBy { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
