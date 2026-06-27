namespace OliveLifecycle.Application.DTOs.TaskTemplate;

public class TaskTemplateDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string LifecycleYear { get; set; } = "low";
    public SchedulingWindowDto? DefaultSchedulingWindow { get; set; }
}

public class SchedulingWindowDto
{
    public int StartMonth { get; set; }
    public int StartDay { get; set; }
    public int EndMonth { get; set; }
    public int EndDay { get; set; }
}
