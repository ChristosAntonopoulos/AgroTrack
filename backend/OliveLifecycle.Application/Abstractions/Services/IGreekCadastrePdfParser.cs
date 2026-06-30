namespace OliveLifecycle.Application.Abstractions.Services;

public class GreekCadastreParseResult
{
    public string? Kaek { get; set; }
    public string? NormalizedKaek { get; set; }
    public double? OfficialAreaSqm { get; set; }
    public double? TitleAreaSqm { get; set; }
    public string? TitleAreaRaw { get; set; }
    public string? LocationText { get; set; }
    public string? CadastralOffice { get; set; }
    public string? Prefecture { get; set; }
    public string? Municipality { get; set; }
    public string? PostalCode { get; set; }
    public string? CoordinateSystem { get; set; }
    public string? MapScale { get; set; }
    public DateTime? ExtractPrintDate { get; set; }
    public List<string> Warnings { get; set; } = new();
}

public interface IGreekCadastrePdfParser
{
    Task<GreekCadastreParseResult> ParseAsync(Stream kdFile, Stream kfFile, CancellationToken cancellationToken = default);
}
