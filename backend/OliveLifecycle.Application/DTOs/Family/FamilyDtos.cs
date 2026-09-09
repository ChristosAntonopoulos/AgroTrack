namespace OliveLifecycle.Application.DTOs.Family;

public class FamilyCircleDto
{
    public string Id { get; set; } = string.Empty;
    public string OwnerUserId { get; set; } = string.Empty;
    public int SeatsUsed { get; set; }
    public int SeatsMax { get; set; } = 2;
    public IReadOnlyList<FamilyMemberDto> Members { get; set; } = Array.Empty<FamilyMemberDto>();
}

public class FamilyMemberDto
{
    public string Id { get; set; } = string.Empty;
    public string CircleId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? LinkedUserId { get; set; }
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = "view";
    public string Status { get; set; } = "pending";
    public string? InviteId { get; set; }
    public FamilyInviteShareDto? PendingInvite { get; set; }
    public FamilyMemberChecklistDto Checklist { get; set; } = new();
}

public class FamilyMemberChecklistDto
{
    public bool HasContact { get; set; }
    public bool InviteSent { get; set; }
    public bool Accepted { get; set; }
    public bool HasModules { get; set; }
    public bool CanCallOrMessage { get; set; }
}

public class CreateFamilyInviteDto
{
    public string DisplayName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = "view";
}

public class UpdateFamilyMemberDto
{
    public string? DisplayName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public List<string>? Modules { get; set; }
    public string? AccessLevel { get; set; }
}

public class FamilyInviteShareDto
{
    public string Id { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string MemberId { get; set; } = string.Empty;
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
/// Lightweight access snapshot used by FieldAccessService and module gates.
/// </summary>
public sealed record FamilyAccessSnapshot(
    string OwnerUserId,
    string MemberId,
    IReadOnlyList<string> Modules,
    string AccessLevel);
