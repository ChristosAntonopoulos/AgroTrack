using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

public class Lifecycle : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public string CurrentYear { get; set; } = "low";
    public string CurrentStage { get; set; } = OliveLifecycleStage.Dormancy;
    public DateTime CycleStartDate { get; set; } = DateTime.UtcNow;
    public DateTime? LastProgressionDate { get; set; }
}
