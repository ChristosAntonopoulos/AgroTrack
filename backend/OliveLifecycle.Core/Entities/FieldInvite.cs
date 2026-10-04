using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

public class FieldInvite : BaseEntity
{
    public string Token { get; set; } = string.Empty;
    /// <summary>Short code for registration (optional; family/partner invites historically used codes).</summary>
    public string? Code { get; set; }
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string InvitedBy { get; set; } = string.Empty;
    public FieldPersonRole Role { get; set; } = FieldPersonRole.Partner;
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = FamilyAccessLevels.Work;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    /// <summary>Set when the invite email already belongs to an Oleachron account.</summary>
    public string? TargetUserId { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime ExpiresAt { get; set; }
    public string? AcceptedBy { get; set; }
}
