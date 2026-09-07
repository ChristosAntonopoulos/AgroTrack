namespace OliveLifecycle.Application.DTOs.User;

public class UserExperiencePreferencesDto
{
    public string ExperienceMode { get; set; } = "everyday";
    public bool ExperienceModeChosen { get; set; }
    public string FontScale { get; set; } = "default";
    public bool LargeControls { get; set; }
    public string Language { get; set; } = "en";
}

public class UpdateUserPreferencesDto
{
    public string? ExperienceMode { get; set; }
    public bool? ExperienceModeChosen { get; set; }
    public string? FontScale { get; set; }
    public bool? LargeControls { get; set; }
    public string? Language { get; set; }
}
