using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class UserMapper
{
    public static User ToEntity(UserDocument document) => new()
    {
        Id = document.Id,
        Email = document.Email,
        PasswordHash = document.PasswordHash,
        Role = ParseRole(document.Role),
        FirstName = document.FirstName,
        LastName = document.LastName,
        Preferences = document.Preferences == null
            ? new UserExperiencePreferences()
            : new UserExperiencePreferences
            {
                ExperienceMode = document.Preferences.ExperienceMode,
                ExperienceModeChosen = document.Preferences.ExperienceModeChosen,
                FontScale = document.Preferences.FontScale,
                LargeControls = document.Preferences.LargeControls,
                Language = string.IsNullOrWhiteSpace(document.Preferences.Language)
                    ? "en"
                    : document.Preferences.Language,
                Notifications = MapNotifications(document.Preferences.Notifications)
            },
        PasswordResetTokenHash = document.PasswordResetTokenHash,
        PasswordResetExpiresAt = document.PasswordResetExpiresAt,
        PendingEmail = document.PendingEmail,
        EmailChangeTokenHash = document.EmailChangeTokenHash,
        EmailChangeExpiresAt = document.EmailChangeExpiresAt,
        DeletedAt = document.DeletedAt,
        LastLoginAt = document.LastLoginAt,
        LastSeenAt = document.LastSeenAt,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static UserDocument ToDocument(User entity) => new()
    {
        Id = entity.Id,
        Email = entity.Email,
        PasswordHash = entity.PasswordHash,
        Role = entity.Role.ToString(),
        FirstName = entity.FirstName,
        LastName = entity.LastName,
        Preferences = MapPreferences(entity.Preferences),
        PasswordResetTokenHash = entity.PasswordResetTokenHash,
        PasswordResetExpiresAt = entity.PasswordResetExpiresAt,
        PendingEmail = entity.PendingEmail,
        EmailChangeTokenHash = entity.EmailChangeTokenHash,
        EmailChangeExpiresAt = entity.EmailChangeExpiresAt,
        DeletedAt = entity.DeletedAt,
        LastLoginAt = entity.LastLoginAt,
        LastSeenAt = entity.LastSeenAt,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    private static UserRole ParseRole(string role) =>
        Enum.TryParse<UserRole>(role, out var parsed) ? parsed : UserRole.FieldOwner;

    /// <summary>
    /// A missing sub-document keeps the in-code defaults. A saved sub-document is honored as stored.
    /// </summary>
    private static UserExperiencePreferencesDocument MapPreferences(UserExperiencePreferences? prefs)
    {
        prefs ??= new UserExperiencePreferences();
        var notes = prefs.Notifications ?? new NotificationPreferences();
        return new UserExperiencePreferencesDocument
        {
            ExperienceMode = prefs.ExperienceMode,
            ExperienceModeChosen = prefs.ExperienceModeChosen,
            FontScale = prefs.FontScale,
            LargeControls = prefs.LargeControls,
            Language = prefs.Language,
            Notifications = new NotificationPreferencesDocument
            {
                TaskAssignment = notes.TaskAssignment,
                Approval = notes.Approval,
                Harvest = notes.Harvest,
                Financial = notes.Financial,
                SatelliteWeather = notes.SatelliteWeather,
                MarketingSystem = notes.MarketingSystem
            }
        };
    }

    private static NotificationPreferences MapNotifications(NotificationPreferencesDocument? document)
    {
        if (document == null)
        {
            return new NotificationPreferences();
        }

        return new NotificationPreferences
        {
            TaskAssignment = document.TaskAssignment,
            Approval = document.Approval,
            Harvest = document.Harvest,
            Financial = document.Financial,
            SatelliteWeather = document.SatelliteWeather,
            MarketingSystem = document.MarketingSystem
        };
    }
}
