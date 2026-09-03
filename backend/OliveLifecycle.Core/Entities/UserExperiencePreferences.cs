namespace OliveLifecycle.Core.Entities;

public class UserExperiencePreferences
{
    public string ExperienceMode { get; set; } = "everyday";
    public bool ExperienceModeChosen { get; set; }
    public string FontScale { get; set; } = "default";
    public bool LargeControls { get; set; }
}
