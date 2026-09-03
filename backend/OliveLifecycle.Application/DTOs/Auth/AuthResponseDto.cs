using OliveLifecycle.Application.DTOs.User;

namespace OliveLifecycle.Application.DTOs.Auth;

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public UserExperiencePreferencesDto Preferences { get; set; } = new();
}
