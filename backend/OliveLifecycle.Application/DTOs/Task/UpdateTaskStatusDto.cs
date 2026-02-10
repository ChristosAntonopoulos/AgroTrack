using System.ComponentModel.DataAnnotations;

namespace OliveLifecycle.Application.DTOs.Task;

public class UpdateTaskStatusDto
{
    [Required]
    public string Status { get; set; } = string.Empty;
}
