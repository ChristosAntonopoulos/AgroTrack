namespace OliveLifecycle.Application.DTOs.Admin;

public class AdminOverviewDto
{
    public AdminOverviewKpisDto Kpis { get; set; } = new();
    public string HealthStatus { get; set; } = "Unknown";
    public IReadOnlyList<AdminUserListItemDto> NewestUsers { get; set; } = Array.Empty<AdminUserListItemDto>();
    public IReadOnlyList<AdminFeedbackAttentionDto> RecentFeedback { get; set; } = Array.Empty<AdminFeedbackAttentionDto>();
    public IReadOnlyList<AdminErrorListItemDto> RecentErrors { get; set; } = Array.Empty<AdminErrorListItemDto>();
}

public class AdminOverviewKpisDto
{
    public int TotalUsers { get; set; }
    public int NewUsers24h { get; set; }
    public int NewUsers7d { get; set; }
    public int ActiveUsers24h { get; set; }
    public int ActiveUsers7d { get; set; }
    public int ActiveUsers30d { get; set; }
    public int UnseenFeedback { get; set; }
    public int Errors24h { get; set; }
    public int UnacknowledgedErrors { get; set; }
}

public class AdminFeedbackAttentionDto
{
    public string Id { get; set; } = string.Empty;
    public string? UserEmail { get; set; }
    public string? UserName { get; set; }
    public string CommentExcerpt { get; set; } = string.Empty;
    public DateTime? SeenAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminUserListItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime? LastSeenAt { get; set; }
    public bool IsDeleted { get; set; }
}

public class AdminUserDetailDto : AdminUserListItemDto
{
    public string? PendingEmail { get; set; }
    public string ExperienceMode { get; set; } = "everyday";
    public string Language { get; set; } = "en";
}

public class AdminUserPageDto
{
    public IReadOnlyList<AdminUserListItemDto> Items { get; set; } = Array.Empty<AdminUserListItemDto>();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class AdminErrorListItemDto
{
    public string Id { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public string Method { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public string ErrorCode { get; set; } = string.Empty;
    public string ExceptionType { get; set; } = string.Empty;
    public string MessageExcerpt { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
}

public class AdminErrorDetailDto : AdminErrorListItemDto
{
    public string Message { get; set; } = string.Empty;
    public string? StackTrace { get; set; }
    public string? RequestId { get; set; }
}

public class AdminErrorPageDto
{
    public IReadOnlyList<AdminErrorListItemDto> Items { get; set; } = Array.Empty<AdminErrorListItemDto>();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
