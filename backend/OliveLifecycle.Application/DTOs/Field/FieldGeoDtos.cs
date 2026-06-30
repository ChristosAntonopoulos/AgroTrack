using OliveLifecycle.Core.ValueObjects;

namespace OliveLifecycle.Application.DTOs.Field;

public class GeoJsonPolygonDto
{
    public string Type { get; set; } = "Polygon";
    public List<List<List<double>>> Coordinates { get; set; } = new();
}

public class GeoJsonPointDto
{
    public string Type { get; set; } = "Point";
    public List<double> Coordinates { get; set; } = new();
}

public class GreekCadastreInfoDto
{
    public string? Kaek { get; set; }
    public string? NormalizedKaek { get; set; }
    public double? OfficialAreaSqm { get; set; }
    public double? TitleAreaSqm { get; set; }
    public string? TitleAreaRaw { get; set; }
    public string? LocationFromCadastre { get; set; }
    public string? CadastralOffice { get; set; }
    public string? Prefecture { get; set; }
    public string? Municipality { get; set; }
    public string? PostalCode { get; set; }
    public string? CoordinateSystem { get; set; }
    public string? MapScale { get; set; }
    public DateTime? ExtractPrintDate { get; set; }
    public string Source { get; set; } = "Manual";
    public string VerificationStatus { get; set; } = "NeedsUserConfirmation";
    public double? AreaDifferenceSqm { get; set; }
    public double? AreaDifferencePercent { get; set; }
}

public class FieldDocumentAttachmentDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
}
