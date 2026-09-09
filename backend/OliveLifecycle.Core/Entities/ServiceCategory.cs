namespace OliveLifecycle.Core.Entities;

public class ServiceCategory : BaseEntity
{
    public string Slug { get; set; } = string.Empty;
    public string NameEl { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string NameIt { get; set; } = string.Empty;
    public string? DescriptionEl { get; set; }
    public string? DescriptionEn { get; set; }
    public string? DescriptionIt { get; set; }
    public string Icon { get; set; } = "handshake";
    public string? ParentCategoryId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsProminent { get; set; }
    public List<string> SuggestedTaskTypes { get; set; } = new();
}
