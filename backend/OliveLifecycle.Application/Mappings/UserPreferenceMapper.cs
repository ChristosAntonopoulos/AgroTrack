using OliveLifecycle.Application.DTOs.User;
using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Mappings;

public static class UserPreferenceMapper
{
    public static UserExperiencePreferencesDto ToDto(UserExperiencePreferences? prefs)
    {
        prefs ??= new UserExperiencePreferences();
        return new UserExperiencePreferencesDto
        {
            ExperienceMode = string.IsNullOrWhiteSpace(prefs.ExperienceMode) ? "everyday" : prefs.ExperienceMode,
            ExperienceModeChosen = prefs.ExperienceModeChosen,
            FontScale = string.IsNullOrWhiteSpace(prefs.FontScale) ? "default" : prefs.FontScale,
            LargeControls = prefs.LargeControls,
            Language = string.IsNullOrWhiteSpace(prefs.Language) ? "en" : prefs.Language,
            Notifications = ToDto(prefs.Notifications)
        };
    }

    public static NotificationPreferencesDto ToDto(NotificationPreferences? prefs)
    {
        prefs ??= new NotificationPreferences();
        return new NotificationPreferencesDto
        {
            TaskAssignment = prefs.TaskAssignment,
            Approval = prefs.Approval,
            Harvest = prefs.Harvest,
            Financial = prefs.Financial,
            SatelliteWeather = prefs.SatelliteWeather,
            MarketingSystem = prefs.MarketingSystem
        };
    }

    public static void Apply(NotificationPreferences target, NotificationPreferencesDto dto)
    {
        target.TaskAssignment = dto.TaskAssignment;
        target.Approval = dto.Approval;
        target.Harvest = dto.Harvest;
        target.Financial = dto.Financial;
        target.SatelliteWeather = dto.SatelliteWeather;
        target.MarketingSystem = dto.MarketingSystem;
    }
}
