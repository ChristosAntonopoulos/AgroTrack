using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities.Geospatial;

public class FieldEnvironmentalAlert : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public string DedupKey { get; set; } = string.Empty;
    public EnvironmentalAlertType AlertType { get; set; }
    public string Severity { get; set; } = "medium";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public DataConfidenceLevel Confidence { get; set; } = DataConfidenceLevel.Medium;
    public bool IsActive { get; set; } = true;
    public string? RelatedTaskId { get; set; }
}
