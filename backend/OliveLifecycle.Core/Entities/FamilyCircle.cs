namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Household circle owned by one grove owner. Extra seats are family members, not marketplace partners.
/// </summary>
public class FamilyCircle : BaseEntity
{
    public string OwnerUserId { get; set; } = string.Empty;
    public const int MaxExtraMembers = 2;
}
