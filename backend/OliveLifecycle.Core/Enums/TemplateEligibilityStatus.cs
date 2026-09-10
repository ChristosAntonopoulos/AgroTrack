namespace OliveLifecycle.Core.Enums;

/// <summary>Outcome of FieldWorkProfile personalisation for one catalogue template.</summary>
public enum TemplateEligibilityStatus
{
    Enabled,
    Suppressed,
    AskFirst
}

public static class TemplateEligibilityStatusExtensions
{
    public static string ToApiString(this TemplateEligibilityStatus status) => status switch
    {
        TemplateEligibilityStatus.Suppressed => "suppressed",
        TemplateEligibilityStatus.AskFirst => "ask_first",
        _ => "enabled"
    };
}
