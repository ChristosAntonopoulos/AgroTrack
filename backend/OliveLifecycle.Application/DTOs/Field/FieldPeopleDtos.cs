namespace OliveLifecycle.Application.DTOs.Field;

public class FieldMembershipDto
{
    public string UserId { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
    public List<string> Capacities { get; set; } = new();
    public string Status { get; set; } = "active";
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
    public List<string> Capacities { get; set; } = new();
}

public class CreateFieldInviteDto
{
    public List<string> Capacities { get; set; } = new() { "work" };
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
}

public class FieldInviteDto
{
    public string Id { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string InvitedBy { get; set; } = string.Empty;
    public List<string> Capacities { get; set; } = new();
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime ExpiresAt { get; set; }
    public string ShareUrl { get; set; } = string.Empty;
    public string WhatsAppUrl { get; set; } = string.Empty;
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
    public List<string> Capacities { get; set; } = new();
    public int CompletedTasks { get; set; }
    public int OverdueTasks { get; set; }
    public int OpenTasks { get; set; }
    public DateTime? LastActivityAt { get; set; }
}
