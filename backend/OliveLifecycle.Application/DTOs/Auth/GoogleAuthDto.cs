using System.ComponentModel.DataAnnotations;

namespace OliveLifecycle.Application.DTOs.Auth;

public class GoogleAuthDto
{
    [Required]
    public string IdToken { get; set; } = string.Empty;

    /// <summary>Optional field invitation code (same rules as email register).</summary>
    public string? InviteCode { get; set; }
}
