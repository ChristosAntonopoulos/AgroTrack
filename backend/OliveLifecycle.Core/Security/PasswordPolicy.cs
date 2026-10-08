namespace OliveLifecycle.Core.Security;

/// <summary>
/// Password strength: at least 8 characters with upper, lower, and a digit.
/// </summary>
public static class PasswordPolicy
{
    public const int MinimumLength = 8;

    public const string ComplexityMessage =
        "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.";

    public static bool MeetsComplexity(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < MinimumLength)
        {
            return false;
        }

        var hasUpper = false;
        var hasLower = false;
        var hasDigit = false;
        foreach (var c in password)
        {
            if (char.IsUpper(c)) hasUpper = true;
            else if (char.IsLower(c)) hasLower = true;
            else if (char.IsDigit(c)) hasDigit = true;
        }

        return hasUpper && hasLower && hasDigit;
    }

    public static void EnsureAcceptable(string? password)
    {
        if (!MeetsComplexity(password))
        {
            throw new Exceptions.ValidationException(ComplexityMessage);
        }
    }
}
