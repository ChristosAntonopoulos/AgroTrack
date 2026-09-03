namespace OliveLifecycle.Core.Entities.Geospatial;

public class DataSourceHealth : BaseEntity
{
    public string SourceId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Status { get; set; } = "Unknown";
    public DateTime? LastSuccessfulUpdate { get; set; }
    public string? LastError { get; set; }
    public string? Details { get; set; }
}
