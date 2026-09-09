using System.Security.Cryptography;

namespace OliveLifecycle.Core;

/// <summary>
/// Short codes people can type at registration (distinct from the 32-char URL token).
/// </summary>
public static class FamilyInviteCodes
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    public const int Length = 8;

    public static string Generate()
    {
        Span<byte> bytes = stackalloc byte[Length];
        RandomNumberGenerator.Fill(bytes);
        var chars = new char[Length];
        for (var i = 0; i < Length; i++)
        {
            chars[i] = Alphabet[bytes[i] % Alphabet.Length];
        }

        return new string(chars);
    }

    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var chars = value.Where(char.IsLetterOrDigit).Select(char.ToUpperInvariant).ToArray();
        return new string(chars);
    }

    public static string FormatDisplay(string? code)
    {
        var normalized = Normalize(code);
        if (normalized.Length != Length)
        {
            return normalized;
        }

        return $"{normalized[..4]}-{normalized[4..]}";
    }
}
