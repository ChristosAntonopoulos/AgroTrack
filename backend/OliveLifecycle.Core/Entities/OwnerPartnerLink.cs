using OliveLifecycle.Core;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Owner-wide work-partner seat. Max one occupied (pending or active) seat per grove owner.
/// Marketplace service providers are a separate concept and do not use this entity.
/// </summary>
public class OwnerPartnerLink : BaseEntity
{
    public const int MaxPartners = 1;

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
