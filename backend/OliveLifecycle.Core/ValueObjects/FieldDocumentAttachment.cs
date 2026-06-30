namespace OliveLifecycle.Core.ValueObjects;

public class FieldDocumentAttachment
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    /// <summary>GreekCadastreSpatialPdf, GreekCadastreDescriptivePdf, Other</summary>
    public string Type { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;

    public DateTime UploadedAt { get; set; }
}
