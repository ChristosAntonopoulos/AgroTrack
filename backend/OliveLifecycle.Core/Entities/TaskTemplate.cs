using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

public class TaskTemplate : BaseEntity
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string LifecycleYear { get; set; } = "low";
    public HarvestPhase? HarvestPhase { get; set; }
    public SchedulingWindow? DefaultSchedulingWindow { get; set; }
    /// <summary>Optional map onto a ServiceCategory.Slug for "Find a partner" from a task.</summary>
    public string? ServiceCategorySlug { get; set; }
}

public class SchedulingWindow
{
    public int StartMonth { get; set; }
    public int StartDay { get; set; }
    public int EndMonth { get; set; }
    public int EndDay { get; set; }
}
