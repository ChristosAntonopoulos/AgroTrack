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

    [Required]
    public string Role { get; set; } = "Producer";
}
