using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities.Geospatial;

public class GeospatialProcessingJob : BaseEntity
{
    public string? FieldId { get; set; }
    public string JobType { get; set; } = string.Empty;
    public GeospatialProcessingStatus Status { get; set; } = GeospatialProcessingStatus.Pending;
    public string? IdempotencyKey { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
