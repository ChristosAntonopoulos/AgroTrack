using OliveLifecycle.Application.DTOs.User;

namespace OliveLifecycle.Application.Services;

public interface IUserService
{
    Task<IEnumerable<UserDto>> GetUsersByRoleAsync(string? role, string callerId, string callerRole, CancellationToken cancellationToken = default);
    Task<UserDto?> GetUserByIdAsync(string id, string callerId, string callerRole, CancellationToken cancellationToken = default);
    Task<UserExperiencePreferencesDto> GetPreferencesAsync(string userId, CancellationToken cancellationToken = default);
    Task<UserExperiencePreferencesDto> UpdatePreferencesAsync(string userId, UpdateUserPreferencesDto dto, CancellationToken cancellationToken = default);
}
