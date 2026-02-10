namespace OliveLifecycle.Application.DTOs.Field;

public class FieldDto
{
    public string Id { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double Area { get; set; }
    public string? Variety { get; set; }
    public int? TreeAge { get; set; }
    public string? GroundType { get; set; }
    public bool IrrigationStatus { get; set; }
    public string CurrentLifecycleYear { get; set; } = "low";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
