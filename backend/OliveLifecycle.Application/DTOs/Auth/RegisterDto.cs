using System.ComponentModel.DataAnnotations;

namespace OliveLifecycle.Application.DTOs.Auth;

public class RegisterDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    /// <summary>
    /// Ignored for new accounts (always FieldOwner). Kept so older clients can still send it.
    /// Privileged values (Administrator, Agronomist, ServiceProvider) are rejected.
    /// </summary>
    public string? Role { get; set; }
}
