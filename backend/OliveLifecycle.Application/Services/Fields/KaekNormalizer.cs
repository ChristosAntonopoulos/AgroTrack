using System.Text.RegularExpressions;
using OliveLifecycle.Application.Abstractions.Services;

namespace OliveLifecycle.Application.Services.Fields;

public class KaekNormalizer : IKaekNormalizer
{
    private static readonly Regex SlashPattern = new(
        @"([\d\s]+)\s*/\s*(\d+)\s*/\s*(\d+)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public bool TryNormalize(string? input, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(input))
        {
            return false;
        }

        var match = SlashPattern.Match(input.Trim());
        if (!match.Success)
        {
            return false;
        }

        var mainDigits = new string(match.Groups[1].Value.Where(char.IsDigit).ToArray());
        var vertical = match.Groups[2].Value.Trim();
        var horizontal = match.Groups[3].Value.Trim();

        if (mainDigits.Length != 12 || !vertical.All(char.IsDigit) || !horizontal.All(char.IsDigit))
        {
            return false;
        }

        normalized = $"{mainDigits}/{vertical}/{horizontal}";
        return true;
    }

    public bool IsValidFormat(string? input) => TryNormalize(input, out _);
}
