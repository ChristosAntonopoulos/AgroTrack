namespace OliveLifecycle.Common.Constants;

/// <summary>
/// JWT / authz role names. These are not product account types — there is only User.
/// New public registrations are always FieldOwner (can own fields and offer services).
/// Existing Producer, ServiceProvider, and Agronomist values stay for login compatibility.
/// </summary>
public static class Roles
{
    public const string FieldOwner = "FieldOwner";
    public const string Producer = "Producer";
    public const string Agronomist = "Agronomist";
    public const string Administrator = "Administrator";
    public const string ServiceProvider = "ServiceProvider";

    /// <summary>
    /// Roles a legacy client may still send. AuthService persists FieldOwner regardless.
    /// </summary>
    public static readonly string[] PublicRegistrationAllowed = { FieldOwner, Producer };

    public static bool IsPublicRegistrationRole(string role) =>
        PublicRegistrationAllowed.Contains(role, StringComparer.Ordinal);
}
