using OliveLifecycle.Core.Enums;

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
}

public class Location
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}
