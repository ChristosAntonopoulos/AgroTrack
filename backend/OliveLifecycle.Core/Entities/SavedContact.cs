using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Private notebook contact owned by one farmer. Not a marketplace listing and not field membership.
/// </summary>
public class SavedContact : BaseEntity
{
    public string OwnerUserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Notes { get; set; }
    public List<string> ServiceCategoryIds { get; set; } = new();
    public List<string> FieldIds { get; set; } = new();
    public string? LinkedUserId { get; set; }
    public SavedContactSource Source { get; set; } = SavedContactSource.Manual;
}
