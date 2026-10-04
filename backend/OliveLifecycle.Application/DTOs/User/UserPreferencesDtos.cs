namespace OliveLifecycle.Application.DTOs.User;

public class NotificationPreferencesDto
{
    public bool TaskAssignment { get; set; } = true;
    public bool Approval { get; set; } = true;
    public bool Harvest { get; set; } = true;
    public bool Financial { get; set; } = true;
    public bool SatelliteWeather { get; set; } = true;
    public bool MarketingSystem { get; set; } = true;
}

public class UserExperiencePreferencesDto
{
    public string ExperienceMode { get; set; } = "everyday";
    public bool ExperienceModeChosen { get; set; }
    public string FontScale { get; set; } = "default";
    public bool LargeControls { get; set; }
    public string Language { get; set; } = "en";
    public NotificationPreferencesDto Notifications { get; set; } = new();
}

public class UpdateUserPreferencesDto
{
    public string? ExperienceMode { get; set; }
    public bool? ExperienceModeChosen { get; set; }
    public string? FontScale { get; set; }
    public bool? LargeControls { get; set; }
    public string? Language { get; set; }
    public NotificationPreferencesDto? Notifications { get; set; }
}
