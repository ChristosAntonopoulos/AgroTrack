namespace OliveLifecycle.Core.Enums;

public enum ChecklistItemRequirement
{
    RequiredBeforeStart,
    RequiredBeforeCompletion,
    Optional
}

public static class ChecklistItemRequirementExtensions
{
    public static string ToApiString(this ChecklistItemRequirement requirement) => requirement switch
    {
        ChecklistItemRequirement.RequiredBeforeStart => "required_before_start",
        ChecklistItemRequirement.RequiredBeforeCompletion => "required_before_completion",
        _ => "optional"
    };

    public static ChecklistItemRequirement FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "required_before_start" => ChecklistItemRequirement.RequiredBeforeStart,
        "required_before_completion" => ChecklistItemRequirement.RequiredBeforeCompletion,
        _ => ChecklistItemRequirement.Optional
    };
}
