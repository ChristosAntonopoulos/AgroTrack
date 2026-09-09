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
    public string CurrentLifecycleStage { get; set; } = "dormancy";
    public List<string> AssignedProducerIds { get; set; } = new();
    public List<FieldMembershipDto> Memberships { get; set; } = new();
    public List<AdvisorCommentDto> AdvisorComments { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public string Status { get; set; } = "Active";
    public string CropType { get; set; } = "Olive";
    public string? LocationText { get; set; }
    public GeoJsonPolygonDto? Boundary { get; set; }
    public GeoJsonPointDto? CenterPoint { get; set; }
    public double? AppMeasuredAreaSqm { get; set; }
    public int? TreeCount { get; set; }
    public string? OliveVariety { get; set; }
    public string? IrrigationType { get; set; }
    public string? SoilType { get; set; }
    public string? Slope { get; set; }
    public string? AccessNotes { get; set; }
    /// <summary>UI accent as #RRGGBB.</summary>
    public string? Color { get; set; }
    public GreekCadastreInfoDto? GreekCadastre { get; set; }
    public List<FieldDocumentAttachmentDto> Documents { get; set; } = new();
}
