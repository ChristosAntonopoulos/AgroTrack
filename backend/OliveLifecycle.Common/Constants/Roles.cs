namespace OliveLifecycle.Common.Constants;

public static class Roles
{
    public const string FieldOwner = "FieldOwner";
    public const string Producer = "Producer";
    public const string Agronomist = "Agronomist";
    public const string Administrator = "Administrator";
    public const string ServiceProvider = "ServiceProvider";

    public static readonly string[] PublicRegistrationAllowed = { FieldOwner, Producer };

    public static bool IsPublicRegistrationRole(string role) =>
        PublicRegistrationAllowed.Contains(role, StringComparer.Ordinal);
}
