namespace OliveLifecycle.Application.DTOs.Partners;

public class SavedContactDto
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Notes { get; set; }
    public List<string> ServiceCategoryIds { get; set; } = new();
    public List<string> FieldIds { get; set; } = new();
    public string? LinkedUserId { get; set; }
    public string Source { get; set; } = "Manual";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpsertSavedContactDto
{
    public string DisplayName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Notes { get; set; }
    public List<string>? ServiceCategoryIds { get; set; }
    public List<string>? FieldIds { get; set; }
    public string? LinkedUserId { get; set; }
    public string? Source { get; set; }
}
