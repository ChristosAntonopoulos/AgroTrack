using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities.FieldWork;

/// <summary>Shape-only rule definition; evaluation engine arrives in Phase 2.</summary>
public class TaskRuleDefinition : BaseEntity
{
    public string TemplateCode { get; set; } = string.Empty;
    public string RuleCode { get; set; } = string.Empty;
    public string GreekExplanation { get; set; } = string.Empty;
    public string EnglishExplanation { get; set; } = string.Empty;
    public ProposalSourceType SourceType { get; set; } = ProposalSourceType.SeasonalBaseline;
    public ProposalConfidence DefaultConfidence { get; set; } = ProposalConfidence.SeasonalReminder;
    public List<string> ReasonCodes { get; set; } = [];
    public BbchRange? RequiredBbchRange { get; set; }
    public MonthDayRange? CandidateMonthRange { get; set; }
    public bool RequiresOfficialWarning { get; set; }
    public bool RequiresAgronomist { get; set; }
    public bool IsActive { get; set; } = true;
}
