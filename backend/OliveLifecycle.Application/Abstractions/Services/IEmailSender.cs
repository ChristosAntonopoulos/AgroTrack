namespace OliveLifecycle.Application.Abstractions.Services;

public interface IEmailSender
{
    /// <summary>
    /// True when an SMTP host is configured and mail can actually be delivered.
    /// </summary>
    bool IsConfigured { get; }

    Task SendAsync(string toEmail, string subject, string textBody, CancellationToken cancellationToken = default);
}
