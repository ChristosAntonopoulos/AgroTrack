namespace OliveLifecycle.Core.Entities;

/// <summary>
/// A person's oil cellar (Το λάδι μου). Stock belongs to a cellar, not to a user account,
/// so oil can outlive membership changes and later be shared between households.
/// </summary>
public class OilCellar : BaseEntity
{
    /// <summary>Person who owns the cellar. Today this is the user id.</summary>
    public string OwnerPersonId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>active | archived</summary>
    public string Status { get; set; } = OilCellarStatuses.Active;
}

public static class OilCellarStatuses
{
    public const string Active = "active";
    public const string Archived = "archived";
}
