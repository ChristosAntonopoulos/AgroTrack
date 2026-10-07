using System.Net.Mail;

namespace OliveLifecycle.Core;

/// <summary>Shared invite/account email checks (format + non-deliverable reserved TLDs).</summary>
public static class EmailAddresses
{
    private static readonly HashSet<string> NonDeliverableTlds = new(StringComparer.OrdinalIgnoreCase)
    {
        "invalid",
        "test",
        "localhost",
        "example"
    };

    public static bool IsDeliverable(string? email)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 200 || !email.Contains('@'))
        {
            return false;
        }

        var normalized = email.Trim();
        try
        {
            var parsed = new MailAddress(normalized);
            if (!string.Equals(parsed.Address, normalized, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var domain = parsed.Host;
            if (string.IsNullOrWhiteSpace(domain) || domain.StartsWith('.') || domain.EndsWith('.') || domain.Contains("..", StringComparison.Ordinal))
            {
                return false;
            }

            var labels = domain.Split('.');
            var tld = labels[^1];
            return !string.IsNullOrWhiteSpace(tld) && !NonDeliverableTlds.Contains(tld);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
