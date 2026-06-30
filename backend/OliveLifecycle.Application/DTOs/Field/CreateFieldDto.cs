using System.ComponentModel.DataAnnotations;

namespace OliveLifecycle.Application.DTOs.Field;

public class CreateFieldDto
{
    [Required]
    [StringLength(80, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    public string CropType { get; set; } = "Olive";

    public string? LocationText { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    [Range(0, double.MaxValue)]
    public double Area { get; set; }

    public GeoJsonPolygonDto? Boundary { get; set; }

    public string? Variety { get; set; }

    [Range(0, int.MaxValue)]
    public int? TreeAge { get; set; }

    [Range(0, int.MaxValue)]
    public int? TreeCount { get; set; }

    public string? GroundType { get; set; }

    public bool IrrigationStatus { get; set; }

    public string? IrrigationType { get; set; }
    public string? SoilType { get; set; }
    public string? Slope { get; set; }
    public string? AccessNotes { get; set; }

    public string? ProducerUserId { get; set; }

    public string? Status { get; set; }

    public GreekCadastreInfoDto? GreekCadastre { get; set; }
}
