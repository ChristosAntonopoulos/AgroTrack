using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Infrastructure.Persistence.Documents;

public class FieldDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerId")]
    public string OwnerId { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("location")]
    public LocationDocument? Location { get; set; }

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

    [BsonElement("currentLifecycleStage")]
    public string CurrentLifecycleStage { get; set; } = "dormancy";

    [BsonElement("assignedProducerIds")]
    public List<string> AssignedProducerIds { get; set; } = new();

    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public FieldStatus Status { get; set; } = FieldStatus.Active;

    [BsonElement("cropType")]
    public string CropType { get; set; } = "Olive";

    [BsonElement("locationText")]
    public string? LocationText { get; set; }

    [BsonElement("boundary")]
    public GeoJsonPolygonDocument? Boundary { get; set; }

    [BsonElement("centerPoint")]
    public GeoJsonPointDocument? CenterPoint { get; set; }

    [BsonElement("appMeasuredAreaSqm")]
    public double? AppMeasuredAreaSqm { get; set; }

    [BsonElement("treeCount")]
    public int? TreeCount { get; set; }

    [BsonElement("irrigationType")]
    public string? IrrigationType { get; set; }

    [BsonElement("soilType")]
    public string? SoilType { get; set; }

    [BsonElement("slope")]
    public string? Slope { get; set; }

    [BsonElement("accessNotes")]
    public string? AccessNotes { get; set; }

    [BsonElement("greekCadastre")]
    public GreekCadastreInfoDocument? GreekCadastre { get; set; }

    [BsonElement("documents")]
    public List<FieldDocumentAttachmentDocument> Documents { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class LocationDocument
{
    [BsonElement("latitude")]
    public double Latitude { get; set; }

    [BsonElement("longitude")]
    public double Longitude { get; set; }
}

public class GeoJsonPolygonDocument
{
    [BsonElement("type")]
    public string Type { get; set; } = "Polygon";

    [BsonElement("coordinates")]
    public List<List<List<double>>> Coordinates { get; set; } = new();
}

public class GeoJsonPointDocument
{
    [BsonElement("type")]
    public string Type { get; set; } = "Point";

    [BsonElement("coordinates")]
    public List<double> Coordinates { get; set; } = new();
}

public class GreekCadastreInfoDocument
{
    [BsonElement("kaek")]
    public string? Kaek { get; set; }

    [BsonElement("normalizedKaek")]
    public string? NormalizedKaek { get; set; }

    [BsonElement("officialAreaSqm")]
    public double? OfficialAreaSqm { get; set; }

    [BsonElement("titleAreaSqm")]
    public double? TitleAreaSqm { get; set; }

    [BsonElement("titleAreaRaw")]
    public string? TitleAreaRaw { get; set; }

    [BsonElement("locationFromCadastre")]
    public string? LocationFromCadastre { get; set; }

    [BsonElement("cadastralOffice")]
    public string? CadastralOffice { get; set; }

    [BsonElement("prefecture")]
    public string? Prefecture { get; set; }

    [BsonElement("municipality")]
    public string? Municipality { get; set; }

    [BsonElement("postalCode")]
    public string? PostalCode { get; set; }

    [BsonElement("coordinateSystem")]
    public string? CoordinateSystem { get; set; }

    [BsonElement("mapScale")]
    public string? MapScale { get; set; }

    [BsonElement("extractPrintDate")]
    public DateTime? ExtractPrintDate { get; set; }

    [BsonElement("source")]
    public string Source { get; set; } = "Manual";

    [BsonElement("verificationStatus")]
    public string VerificationStatus { get; set; } = "NeedsUserConfirmation";

    [BsonElement("areaDifferenceSqm")]
    public double? AreaDifferenceSqm { get; set; }

    [BsonElement("areaDifferencePercent")]
    public double? AreaDifferencePercent { get; set; }
}

public class FieldDocumentAttachmentDocument
{
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    [BsonElement("type")]
    public string Type { get; set; } = string.Empty;

    [BsonElement("fileName")]
    public string FileName { get; set; } = string.Empty;

    [BsonElement("storagePath")]
    public string StoragePath { get; set; } = string.Empty;

    [BsonElement("uploadedAt")]
    public DateTime UploadedAt { get; set; }
}
