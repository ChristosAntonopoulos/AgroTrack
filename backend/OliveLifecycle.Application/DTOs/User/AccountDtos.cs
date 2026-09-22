namespace OliveLifecycle.Application.DTOs.User;

public class UpdateProfileDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}

public class ChangePasswordDto
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class RequestEmailChangeDto
{
    public string NewEmail { get; set; } = string.Empty;
    public string CurrentPassword { get; set; } = string.Empty;
}

public class RequestEmailChangeResponseDto
{
    public bool Sent { get; set; }
    public string PendingEmail { get; set; } = string.Empty;

    /// <summary>
    /// Six-digit code, only when SMTP is not configured and Email:ExposeDevResetLink is true.
    /// </summary>
    public string? DevCode { get; set; }
}

public class ConfirmEmailChangeDto
{
    public string Code { get; set; } = string.Empty;
}

public class DeleteAccountDto
{
    public string CurrentPassword { get; set; } = string.Empty;
}

public class AccountExportDto
{
    public DateTime ExportedAt { get; set; }
    public AccountProfileExportDto Profile { get; set; } = new();
    public UserExperiencePreferencesDto Preferences { get; set; } = new();
    public IReadOnlyList<AccountFieldExportDto> Fields { get; set; } = Array.Empty<AccountFieldExportDto>();
    public IReadOnlyList<AccountNotificationExportDto> Notifications { get; set; } = Array.Empty<AccountNotificationExportDto>();
    public AccountSupportExportDto Support { get; set; } = new();
}

public class AccountProfileExportDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class AccountFieldExportDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? LocationText { get; set; }
    public double AreaHectares { get; set; }
    public string? Variety { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class AccountNotificationExportDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AccountSupportExportDto
{
    public string Email { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
}
