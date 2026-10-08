namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Long-lived session credential. Only the SHA-256 hash is stored.
/// Rotated on each successful refresh.
/// </summary>
public class RefreshToken : BaseEntity
{
    public string UserId { get; set; } = string.Empty;

    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public string? ReplacedByTokenHash { get; set; }

    public bool IsActive => RevokedAt == null && ExpiresAt > DateTime.UtcNow;
}
