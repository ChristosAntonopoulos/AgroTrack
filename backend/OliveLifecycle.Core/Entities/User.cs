using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;

    /// <summary>Empty for Google-only accounts that have never set a password.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>Google account subject (`sub`) when linked via Sign in with Google.</summary>
    public string? GoogleSubjectId { get; set; }

    public UserRole Role { get; set; } = UserRole.Producer;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public UserExperiencePreferences Preferences { get; set; } = new();
    public string? PasswordResetTokenHash { get; set; }
    public DateTime? PasswordResetExpiresAt { get; set; }
    public string? PendingEmail { get; set; }
    public string? EmailChangeTokenHash { get; set; }
    public DateTime? EmailChangeExpiresAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    /// <summary>UTC time of the last successful password login.</summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>UTC time of the last authenticated API activity (throttled).</summary>
    public DateTime? LastSeenAt { get; set; }
}
