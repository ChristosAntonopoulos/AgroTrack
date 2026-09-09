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
                    : document.Preferences.Language
            },
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
        Preferences = new UserExperiencePreferencesDocument
        {
            ExperienceMode = entity.Preferences.ExperienceMode,
            ExperienceModeChosen = entity.Preferences.ExperienceModeChosen,
            FontScale = entity.Preferences.FontScale,
            LargeControls = entity.Preferences.LargeControls,
            Language = entity.Preferences.Language
        },
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    private static UserRole ParseRole(string role) =>
        Enum.TryParse<UserRole>(role, out var parsed) ? parsed : UserRole.FieldOwner;
}
