using System.ComponentModel.DataAnnotations;

namespace OliveLifecycle.Application.DTOs.Field;

public class UpdateFieldDto
{
    [StringLength(200)]
    public string? Name { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    [Range(0, double.MaxValue)]
    public double? Area { get; set; }

    public string? Variety { get; set; }

    [Range(0, int.MaxValue)]
    public int? TreeAge { get; set; }

    public string? GroundType { get; set; }

    public bool? IrrigationStatus { get; set; }
}
