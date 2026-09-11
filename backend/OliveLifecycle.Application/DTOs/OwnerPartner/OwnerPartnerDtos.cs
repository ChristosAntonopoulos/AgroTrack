namespace OliveLifecycle.Application.DTOs.OwnerPartner;

public class OwnerPartnerSeatDto
{
    public string OwnerUserId { get; set; } = string.Empty;
    public int SeatsUsed { get; set; }
    public int SeatsMax { get; set; } = 1;
    public OwnerPartnerLinkDto? Partner { get; set; }
}

public class OwnerPartnerLinkDto
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? LinkedUserId { get; set; }
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = "view";
    public string Status { get; set; } = "pending";
    public string? InviteId { get; set; }
    public OwnerPartnerInviteShareDto? PendingInvite { get; set; }
    public OwnerPartnerChecklistDto Checklist { get; set; } = new();
}

public class OwnerPartnerChecklistDto
{
    public bool HasContact { get; set; }
    public bool InviteSent { get; set; }
    public bool Accepted { get; set; }
    public bool HasModules { get; set; }
    public bool CanCallOrMessage { get; set; }
}

public class CreateOwnerPartnerInviteDto
{
    public string DisplayName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = "view";
}

public class UpdateOwnerPartnerLinkDto
{
    public string? DisplayName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public List<string>? Modules { get; set; }
    public string? AccessLevel { get; set; }
}

public class OwnerPartnerInviteShareDto
{
    public string Id { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string LinkId { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = "view";
    public string Status { get; set; } = "pending";
    public DateTime ExpiresAt { get; set; }
    public string? OwnerDisplayName { get; set; }
    public string ShareUrl { get; set; } = string.Empty;
    public string WhatsAppUrl { get; set; } = string.Empty;
    public string MailtoUrl { get; set; } = string.Empty;
    public string SmsUrl { get; set; } = string.Empty;
}

/// <summary>
/// Lightweight access snapshot used by FieldAccessService (same shape as family).
/// </summary>
public sealed record OwnerPartnerAccessSnapshot(
    string OwnerUserId,
    string LinkId,
    IReadOnlyList<string> Modules,
    string AccessLevel);
