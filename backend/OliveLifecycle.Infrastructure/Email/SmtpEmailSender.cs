using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Services;

namespace OliveLifecycle.Infrastructure.Email;

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IConfiguration configuration, ILogger<SmtpEmailSender> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_configuration["Email:SmtpHost"]);

    public async Task SendAsync(string toEmail, string subject, string textBody, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            _logger.LogInformation(
                "SMTP is not configured. Email to {To} skipped. Subject: {Subject}{NewLine}{Body}",
                toEmail,
                subject,
                Environment.NewLine,
                textBody);
            return;
        }

        var host = _configuration["Email:SmtpHost"]!;
        var port = int.TryParse(_configuration["Email:SmtpPort"], out var parsedPort) ? parsedPort : 587;
        var enableSsl = !string.Equals(_configuration["Email:EnableSsl"], "false", StringComparison.OrdinalIgnoreCase);
        var fromAddress = string.IsNullOrWhiteSpace(_configuration["Email:FromAddress"])
            ? "hello@The Olive Lot.app"
            : _configuration["Email:FromAddress"]!;
        var fromName = string.IsNullOrWhiteSpace(_configuration["Email:FromName"])
            ? "The Olive Lot"
            : _configuration["Email:FromName"]!;
        var user = _configuration["Email:SmtpUser"];
        var password = _configuration["Email:SmtpPassword"];

        using var message = new MailMessage
        {
            From = new MailAddress(fromAddress, fromName),
            Subject = subject,
            Body = textBody
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        if (!string.IsNullOrWhiteSpace(user))
        {
            client.Credentials = new NetworkCredential(user, password);
        }

        await client.SendMailAsync(message, cancellationToken);
    }
}
