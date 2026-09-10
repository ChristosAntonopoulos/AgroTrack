using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities.FieldWork;

/// <summary>Temporary system suggestion for a field and result year. Not a calendar task.</summary>
public class TaskProposal : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public string TemplateCode { get; set; } = string.Empty;
    public int TemplateVersion { get; set; } = 1;
    public ProposalSourceType SourceType { get; set; } = ProposalSourceType.SeasonalBaseline;
    public string? SourceReference { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidUntil { get; set; }
    public ProposalConfidence Confidence { get; set; } = ProposalConfidence.SeasonalReminder;
    public List<string> ReasonCodes { get; set; } = [];
    public string GreekExplanation { get; set; } = string.Empty;
    public string? EnglishExplanation { get; set; }
    public string? RequiredEvidence { get; set; }
    public string? WeatherEvaluationId { get; set; }
    public DateTime? RecommendedWindowStart { get; set; }
    public DateTime? RecommendedWindowEnd { get; set; }
    public string DedupKey { get; set; } = string.Empty;
    public TaskProposalStatus Status { get; set; } = TaskProposalStatus.Active;
    public TaskProposalDecision? Decision { get; set; }
    public DateTime? DecisionAt { get; set; }
    public string? DecisionByUserId { get; set; }
    public string? AcceptedTaskId { get; set; }
    public DateTime? SnoozeUntil { get; set; }
}
