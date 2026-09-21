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
    public List<string> Modules { get; set; } = new() { "fields", "tasks", "calendar" };
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
    public string Role { get; set; } = FieldPersonRole.Partner.ToString();
    public List<string> Modules { get; set; } = new();
    public string AccessLevel { get; set; } = "work";
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime ExpiresAt { get; set; }
    public string ShareUrl { get; set; } = string.Empty;
    public string WhatsAppUrl { get; set; } = string.Empty;
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
}
