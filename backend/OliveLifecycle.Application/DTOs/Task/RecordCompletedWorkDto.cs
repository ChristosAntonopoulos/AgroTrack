using System.ComponentModel.DataAnnotations;

namespace OliveLifecycle.Application.DTOs.Task;

public class RecordCompletedWorkDto
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

    /// <summary>When the work actually happened.</summary>
    public DateTime? OccurredAt { get; set; }

    public decimal? CostAmount { get; set; }

    public string? Currency { get; set; }

    public string? CostCategory { get; set; }

    public List<string>? MediaUrls { get; set; }
}
