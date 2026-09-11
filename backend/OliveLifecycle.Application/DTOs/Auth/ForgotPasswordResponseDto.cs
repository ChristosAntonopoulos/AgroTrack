namespace OliveLifecycle.Application.DTOs.Auth;

public class ForgotPasswordResponseDto
{
    public bool Sent { get; set; } = true;

    /// <summary>
    /// Raw reset token, only when SMTP is not configured and Email:ExposeDevResetLink is true.
    /// Lets local testing complete the flow without a mailbox.
    /// </summary>
    public string? DevResetToken { get; set; }
}
