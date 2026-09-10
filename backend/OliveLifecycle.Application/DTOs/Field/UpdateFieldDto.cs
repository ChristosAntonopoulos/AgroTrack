using System.ComponentModel.DataAnnotations;

namespace OliveLifecycle.Application.DTOs.Field;

public class UpdateFieldDto
{
    [StringLength(80, MinimumLength = 2)]
    public string? Name { get; set; }

    public string? CropType { get; set; }
    public string? LocationText { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    /// <summary>Area in hectares. Ignored when <see cref="AppMeasuredAreaSqm"/> is provided.</summary>
    [Range(0, double.MaxValue)]
    public double? Area { get; set; }

    /// <summary>Canonical measured area in square metres.</summary>
    [Range(0, double.MaxValue)]
    public double? AppMeasuredAreaSqm { get; set; }

    public GeoJsonPolygonDto? Boundary { get; set; }

    public string? Variety { get; set; }

    [Range(0, int.MaxValue)]
    public int? TreeAge { get; set; }

    [Range(0, int.MaxValue)]
    public int? TreeCount { get; set; }

    public string? GroundType { get; set; }

    public bool? IrrigationStatus { get; set; }

    public string? IrrigationType { get; set; }
    public string? SoilType { get; set; }
    public string? Slope { get; set; }
    public string? AccessNotes { get; set; }

    /// <summary>UI accent as #RRGGBB.</summary>
    [RegularExpression("^#[0-9A-Fa-f]{6}$")]
    public string? Color { get; set; }

    public GreekCadastreInfoDto? GreekCadastre { get; set; }
}
