namespace OliveLifecycle.Core.Entities;

public class UserExperiencePreferences
{
    public string ExperienceMode { get; set; } = "everyday";
    public bool ExperienceModeChosen { get; set; }
    public string FontScale { get; set; } = "default";
    public bool LargeControls { get; set; }
    public string Language { get; set; } = "en";
    public NotificationPreferences Notifications { get; set; } = new();
}

/// <summary>
/// Which inbox categories this account wants. Stored on the user, not on one browser.
/// </summary>
public class NotificationPreferences
{
    public bool TaskAssignment { get; set; } = true;
    public bool Approval { get; set; } = true;
    public bool Harvest { get; set; } = true;
    public bool Financial { get; set; } = true;
    public bool SatelliteWeather { get; set; } = true;
    public bool MarketingSystem { get; set; } = true;
}
