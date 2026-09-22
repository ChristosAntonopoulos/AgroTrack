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
}

public class UpdateFieldPersonDto
{
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
    public bool CanDeleteField { get; set; }
}

