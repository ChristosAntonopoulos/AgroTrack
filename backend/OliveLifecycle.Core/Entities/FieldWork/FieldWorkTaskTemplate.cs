using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities.FieldWork;

/// <summary>
/// Versioned definition of a possible olive-growing activity. Not a user task.
/// Lives in collection field_work_templates (distinct from legacy task_templates).
/// </summary>
public class FieldWorkTaskTemplate : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public int CurrentVersion { get; set; } = 1;
    public string GreekName { get; set; } = string.Empty;
    public string EnglishName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public MonthDayRange? CandidateMonthRange { get; set; }
    public BbchRange? CandidateBbchRange { get; set; }
    public TimeSpan? DefaultDuration { get; set; }
    public List<string> RequiredFieldCapabilities { get; set; } = [];
    public string? WeatherRuleProfile { get; set; }
    public string? CompletionSchema { get; set; }
    public string? FinancialCategorySuggestion { get; set; }
    public bool IsActive { get; set; } = true;
}
