using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.DTOs.Field;

public class FieldMembershipDto
{
    public string UserId { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
    public string Role { get; set; } = FieldPersonRole.Family.ToString();
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = "view";
    public string Status { get; set; } = "active";
    public string? InviteId { get; set; }
    public string? InvitedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdvisorCommentDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class UpsertFieldMembershipDto
{
    public string Role { get; set; } = FieldPersonRole.Partner.ToString();
    public List<string>? Modules { get; set; }
    public string? AccessLevel { get; set; }
}

public class CreateFieldInviteDto
{
    /// <summary>Partner or Family. Admin is created with the field.</summary>
    public string Role { get; set; } = FieldPersonRole.Partner.ToString();
    public List<string> Modules { get; set; } = new() { "fields", "tasks", "photos", "chronologio" };
    public string AccessLevel { get; set; } = "work";
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
}

public class FieldInviteDto
{
    public string Id { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string InvitedBy { get; set; } = string.Empty;
    public string? InvitedByName { get; set; }
    public string Role { get; set; } = FieldPersonRole.Partner.ToString();
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = "work";
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? AcceptedBy { get; set; }
    public string ShareUrl { get; set; } = string.Empty;
    public string WhatsAppUrl { get; set; } = string.Empty;
    public string? MailtoUrl { get; set; }
    public bool EmailSent { get; set; }
    /// <summary>True when the invite email already has a The Olive Lot account.</summary>
    public bool InviteeHasAccount { get; set; }
    public string? TargetUserId { get; set; }
    /// <summary>True when an in-app notification was queued for an existing invitee.</summary>
    public bool NotificationQueued { get; set; }
}

public class UpdateFieldPersonDto
{
    /// <summary>Family or Collaborator (stored as Partner). Owner cannot be assigned here.</summary>
    public string? Role { get; set; }
    public List<string>? Modules { get; set; }
    public string? AccessLevel { get; set; }
}

public class CreateAdvisorCommentDto
{
    public string Body { get; set; } = string.Empty;
}

public class FieldPeopleStatsDto
{
    public string FieldId { get; set; } = string.Empty;
    public List<PersonWorkStatsDto> People { get; set; } = new();
}

public class PersonWorkStatsDto
{
    public string UserId { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string Role { get; set; } = FieldPersonRole.Family.ToString();
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = "view";
    public int CompletedTasks { get; set; }
    public int OverdueTasks { get; set; }
    public int OpenTasks { get; set; }
    public DateTime? LastActivityAt { get; set; }
}

/// <summary>Per-field effective access for the current user (drives nav / gates).</summary>
public class FieldAccessSnapshotDto
{
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string Role { get; set; } = FieldPersonRole.Family.ToString();
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = "view";
    public string AdminUserId { get; set; } = string.Empty;
    public FieldCapabilitiesDto Capabilities { get; set; } = new();
}

/// <summary>
/// Effective UI capabilities for one user on one field. Server authorization remains authoritative.
/// </summary>
/// <summary>
/// Person-first payload for the people page. One account appears once, with a membership per grove.
/// </summary>
public class ManagedPeopleDto
{
    public List<PersonAccessDto> People { get; set; } = new();
    public List<FieldInviteDto> PendingInvites { get; set; } = new();
    public List<OliveLifecycle.Application.DTOs.Partners.SavedContactDto> Contacts { get; set; } = new();
    public List<ManageableFieldDto> ManageableFields { get; set; } = new();
}

public class PersonAccessDto
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public List<PersonFieldAccessDto> Memberships { get; set; } = new();
}

public class PersonFieldAccessDto
{
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    /// <summary>Family or Partner. Partner is the collaborator relationship.</summary>
    public string Relationship { get; set; } = FieldPersonRole.Family.ToString();
    public string AccessPreset { get; set; } = "view";
    public List<string> Modules { get; set; } = new();
    public string Status { get; set; } = "active";
}

public class ManageableFieldDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string OwnerUserId { get; set; } = string.Empty;
    public string? OwnerDisplayName { get; set; }
    public string? OwnerEmail { get; set; }
}

public class CreateMultiFieldInviteDto
{
    public List<string> FieldIds { get; set; } = new();
    /// <summary>Family or Collaborator.</summary>
    public string Relationship { get; set; } = FieldPersonRole.Family.ToString();
    /// <summary>view, help (record), or work (record and tasks).</summary>
    public string AccessPreset { get; set; } = "view";
    public List<string> Modules { get; set; } = new();
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? DisplayName { get; set; }
}

public class FieldCapabilitiesDto
{
    public bool CanViewField { get; set; }
    public bool CanViewBoundary { get; set; }
    public bool CanViewSensitiveIdentity { get; set; }
    public bool CanViewEnvironmentalData { get; set; }
    public bool CanViewChronologio { get; set; }
    public bool CanCreateRecords { get; set; }
    public bool CanViewTasks { get; set; }
    public bool CanManageTasks { get; set; }
    public bool CanViewPhotos { get; set; }
    public bool CanUploadPhotos { get; set; }
    public bool CanViewMoney { get; set; }
    public bool CanViewHarvest { get; set; }
    public bool CanViewDocuments { get; set; }
    public bool CanManageDocuments { get; set; }
    public bool CanManageAccess { get; set; }
    public bool CanEditField { get; set; }
    public bool CanArchiveField { get; set; }
    public bool CanRestoreField { get; set; }
    /// <summary>True only when the caller may delete and the field has no linked history.</summary>
    public bool CanPermanentlyDelete { get; set; }
    public bool CanDeleteField { get; set; }
}

