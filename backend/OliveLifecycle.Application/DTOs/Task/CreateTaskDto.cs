using System.ComponentModel.DataAnnotations;

namespace OliveLifecycle.Application.DTOs.Task;

public class CreateTaskDto
{
    [Required]
    public string FieldId { get; set; } = string.Empty;

    public string? TemplateId { get; set; }

    [Required]
    [StringLength(200)]
    public string Type { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? LifecycleYear { get; set; }

    public string? HarvestPhase { get; set; }

    public string? AssignedTo { get; set; }

    public DateTime? ScheduledStart { get; set; }

    public DateTime? ScheduledEnd { get; set; }
}
