using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Producer;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public UserExperiencePreferences Preferences { get; set; } = new();
}
