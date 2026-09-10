using OliveLifecycle.Core.Entities.FieldWork;

namespace OliveLifecycle.Core.FieldWork;

public static class FieldWorkCatalogueMapper
{
    public static FieldWorkTaskTemplate ToTemplate(FieldWorkCatalogueEntry entry) => new()
    {
        Code = entry.Code,
        CurrentVersion = FieldWorkCatalogue.Version,
        GreekName = entry.GreekName,
        EnglishName = entry.EnglishName,
        Category = entry.Category,
        Description = entry.Description,
        CandidateMonthRange = entry.CandidateMonthRange,
        CandidateBbchRange = entry.CandidateBbchRange,
        DefaultDuration = entry.DefaultDuration,
        RequiredFieldCapabilities = entry.RequiredFieldCapabilities.ToList(),
        WeatherRuleProfile = entry.WeatherRuleProfile,
        CompletionSchema = entry.CompletionSchema,
        FinancialCategorySuggestion = entry.FinancialCategorySuggestion,
        IsActive = true
    };

    public static FieldWorkTaskTemplateVersion ToVersion(FieldWorkCatalogueEntry entry) => new()
    {
        TemplateCode = entry.Code,
        Version = FieldWorkCatalogue.Version,
        GreekName = entry.GreekName,
        EnglishName = entry.EnglishName,
        Description = entry.Description,
        CandidateMonthRange = entry.CandidateMonthRange,
        CandidateBbchRange = entry.CandidateBbchRange,
        DefaultDuration = entry.DefaultDuration,
        DefaultChecklist = entry.DefaultChecklist
            .Select((c, i) => new TaskChecklistDefinition
            {
                Key = c.Key,
                GreekLabel = c.GreekLabel,
                EnglishLabel = c.EnglishLabel,
                ItemType = c.ItemType,
                Requirement = c.Requirement,
                Choices = c.Choices.ToList(),
                Unit = c.Unit,
                IsEssential = c.IsEssential,
                SortOrder = c.SortOrder > 0 ? c.SortOrder : i + 1
            })
            .ToList(),
        RequiredFieldCapabilities = entry.RequiredFieldCapabilities.ToList(),
        WeatherRuleProfile = entry.WeatherRuleProfile,
        CompletionSchema = entry.CompletionSchema,
        FinancialCategorySuggestion = entry.FinancialCategorySuggestion,
        IsActive = true
    };

    public static TaskRuleDefinition ToRule(FieldWorkCatalogueEntry entry, CatalogueRule rule) => new()
    {
        TemplateCode = entry.Code,
        RuleCode = rule.RuleCode,
        GreekExplanation = rule.GreekExplanation,
        EnglishExplanation = rule.EnglishExplanation ?? string.Empty,
        SourceType = rule.SourceType,
        DefaultConfidence = rule.DefaultConfidence,
        ReasonCodes = rule.ReasonCodes.ToList(),
        RequiredBbchRange = rule.RequiredBbchRange ?? entry.CandidateBbchRange,
        CandidateMonthRange = rule.CandidateMonthRange ?? entry.CandidateMonthRange,
        RequiresOfficialWarning = rule.RequiresOfficialWarning || entry.IsPlantProtectionTreatment,
        RequiresAgronomist = rule.RequiresAgronomist,
        IsActive = true
    };
}
