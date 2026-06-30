using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.ValueObjects;
using OliveLifecycleStage = OliveLifecycle.Core.Enums.OliveLifecycleStage;

namespace OliveLifecycle.Core.Entities;

public class Field : BaseEntity
{
    public string OwnerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Location? Location { get; set; }
    public double Area { get; set; }
    public string? Variety { get; set; }
    public int? TreeAge { get; set; }
    public string? GroundType { get; set; }
    public bool IrrigationStatus { get; set; }
    public string CurrentLifecycleYear { get; set; } = "low";
    public string CurrentLifecycleStage { get; set; } = OliveLifecycleStage.Dormancy;
    public List<string> AssignedProducerIds { get; set; } = new();

    public FieldStatus Status { get; set; } = FieldStatus.Active;
    public string CropType { get; set; } = "Olive";
    public string? LocationText { get; set; }
    public GeoJsonPolygon? Boundary { get; set; }
    public GeoJsonPoint? CenterPoint { get; set; }
    public double? AppMeasuredAreaSqm { get; set; }
    public int? TreeCount { get; set; }
    public string? IrrigationType { get; set; }
    public string? SoilType { get; set; }
    public string? Slope { get; set; }
    public string? AccessNotes { get; set; }
    public GreekCadastreInfo? GreekCadastre { get; set; }
    public List<FieldDocumentAttachment> Documents { get; set; } = new();
}

public class Location
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}
