using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.ValueObjects;
using OliveLifecycleStage = OliveLifecycle.Core.Enums.OliveLifecycleStage;

namespace OliveLifecycle.Core.Entities;

public class Field : BaseEntity
{
    public string OwnerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Location? Location { get; set; }
    /// <summary>Field area in hectares. Canonical measured area is <see cref="AppMeasuredAreaSqm"/> (m²).</summary>
    public double Area { get; set; }
    public string? Variety { get; set; }
    public int? TreeAge { get; set; }
    public string? GroundType { get; set; }
    public bool IrrigationStatus { get; set; }
    public string CurrentLifecycleYear { get; set; } = "low";
    public string CurrentLifecycleStage { get; set; } = OliveLifecycleStage.Dormancy;
    public List<string> AssignedProducerIds { get; set; } = new();
    public List<FieldMembership> Memberships { get; set; } = new();
    public List<AdvisorComment> AdvisorComments { get; set; } = new();

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
    /// <summary>UI accent color as #RRGGBB. Used in Chronologio and field cards.</summary>
    public string? Color { get; set; }
    public GreekCadastreInfo? GreekCadastre { get; set; }
    public List<FieldDocumentAttachment> Documents { get; set; } = new();

    public bool TryGetCoordinates(out double latitude, out double longitude)
    {
        if (CenterPoint?.Coordinates is { Count: >= 2 })
        {
            longitude = CenterPoint.Coordinates[0];
            latitude = CenterPoint.Coordinates[1];
            return true;
        }

        if (Location != null)
        {
            latitude = Location.Latitude;
            longitude = Location.Longitude;
            return true;
        }

        latitude = 0;
        longitude = 0;
        return false;
    }

    /// <summary>Public-safe area label. Never returns coordinates.</summary>
    public string GetApproximateAreaLabel()
    {
        if (!string.IsNullOrWhiteSpace(LocationText))
        {
            return LocationText.Trim();
        }

        var municipality = GreekCadastre?.Municipality;
        if (!string.IsNullOrWhiteSpace(municipality))
        {
            return municipality.Trim();
        }

        var prefecture = GreekCadastre?.Prefecture;
        if (!string.IsNullOrWhiteSpace(prefecture))
        {
            return prefecture.Trim();
        }

        return Name;
    }
}

public class Location
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}
