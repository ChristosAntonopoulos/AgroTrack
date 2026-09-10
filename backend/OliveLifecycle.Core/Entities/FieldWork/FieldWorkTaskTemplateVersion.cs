namespace OliveLifecycle.Core.Entities.FieldWork;

/// <summary>Immutable template version body including default checklist.</summary>
public class FieldWorkTaskTemplateVersion : BaseEntity
{
    public string TemplateCode { get; set; } = string.Empty;
    public int Version { get; set; } = 1;
    public string GreekName { get; set; } = string.Empty;
    public string EnglishName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public MonthDayRange? CandidateMonthRange { get; set; }
    public BbchRange? CandidateBbchRange { get; set; }
    public TimeSpan? DefaultDuration { get; set; }
    public List<TaskChecklistDefinition> DefaultChecklist { get; set; } = [];
    public List<string> RequiredFieldCapabilities { get; set; } = [];
    public string? WeatherRuleProfile { get; set; }
    public string? CompletionSchema { get; set; }
    public string? FinancialCategorySuggestion { get; set; }
    public bool IsActive { get; set; } = true;
}
