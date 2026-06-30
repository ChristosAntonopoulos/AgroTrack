namespace OliveLifecycle.Core.ValueObjects;

public class GreekCadastreInfo
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
