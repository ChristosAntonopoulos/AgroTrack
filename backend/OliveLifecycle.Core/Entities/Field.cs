using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OliveLifecycle.Core.Entities;

public class Field
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerId")]
    public string OwnerId { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("location")]
    public Location? Location { get; set; }

    [BsonElement("area")]
    public double Area { get; set; }

    [BsonElement("variety")]
    public string? Variety { get; set; }

    [BsonElement("treeAge")]
    public int? TreeAge { get; set; }

    [BsonElement("groundType")]
    public string? GroundType { get; set; }

    [BsonElement("irrigationStatus")]
    public bool IrrigationStatus { get; set; }

    [BsonElement("currentLifecycleYear")]
    public string CurrentLifecycleYear { get; set; } = "low";

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Location
{
    [BsonElement("latitude")]
    public double Latitude { get; set; }

    [BsonElement("longitude")]
    public double Longitude { get; set; }
}
