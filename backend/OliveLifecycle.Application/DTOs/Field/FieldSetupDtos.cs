namespace OliveLifecycle.Application.DTOs.Field;

public class UpdateFieldBoundaryRequest
{
    public GeoJsonPolygonDto Boundary { get; set; } = new();
}

public class FieldAreaValidationResponse
{
    public double? OfficialAreaSqm { get; set; }
    public double AppMeasuredAreaSqm { get; set; }
    public double? DifferenceSqm { get; set; }
    public double? DifferencePercent { get; set; }
    public string Severity { get; set; } = "Ok";
    public string Message { get; set; } = string.Empty;
    public List<string> Warnings { get; set; } = new();
}

public class ImportGreekCadastreFieldResponse
{
    public string DraftFieldId { get; set; } = string.Empty;
    public string? SuggestedName { get; set; }
    public GreekCadastreInfoDto GreekCadastre { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public List<string> MissingRequiredConfirmation { get; set; } = new();
    public List<string> DuplicateKaekFieldIds { get; set; } = new();
}

public class ActivateFieldRequest
{
    public bool BoundaryConfirmed { get; set; }
    public bool CadastreReferenceAcknowledged { get; set; }
}

public class ActivateFieldResponse
{
    public FieldDto Field { get; set; } = new();
    public bool SuggestLifecyclePlan { get; set; }
    public bool LifecycleInitialized { get; set; }
}
