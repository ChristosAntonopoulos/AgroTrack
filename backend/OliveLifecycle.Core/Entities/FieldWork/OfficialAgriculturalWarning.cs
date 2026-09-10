using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities.FieldWork;

/// <summary>Field- or region-scoped official agricultural warning (lean Phase 1 shape).</summary>
public class OfficialAgriculturalWarning : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? SourceOrganization { get; set; }
    public string? SourceUrl { get; set; }
    public string? SourceReference { get; set; }
    public DateTime PublishedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidUntil { get; set; }
    public List<string> FieldIds { get; set; } = [];
    public List<string> RegionCodes { get; set; } = [];
    public List<string> TemplateCodes { get; set; } = [];
    public BbchRange? RelevantBbchRange { get; set; }
    public ProposalConfidence Confidence { get; set; } = ProposalConfidence.StrongEvidence;
    public bool IsActive { get; set; } = true;
}
