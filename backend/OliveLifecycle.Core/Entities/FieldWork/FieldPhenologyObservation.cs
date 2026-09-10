using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities.FieldWork;

public class FieldPhenologyObservation : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public OliveBbchStage StageCode { get; set; } = OliveBbchStage.Unknown;
    public DateTime ObservedOn { get; set; } = DateTime.UtcNow;
    public PhenologySource Source { get; set; } = PhenologySource.User;
    public ProposalConfidence Confidence { get; set; } = ProposalConfidence.WorthChecking;
    public List<string> PhotoIds { get; set; } = [];
    public string? Notes { get; set; }
    public string ObservedByUserId { get; set; } = string.Empty;
}
