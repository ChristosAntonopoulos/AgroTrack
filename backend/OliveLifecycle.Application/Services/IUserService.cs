using OliveLifecycle.Application.DTOs.User;

namespace OliveLifecycle.Application.Services;

public interface IUserService
{
    Task<IEnumerable<UserDto>> GetUsersByRoleAsync(string? role, string callerId, string callerRole, CancellationToken cancellationToken = default);
    Task<UserDto?> GetUserByIdAsync(string id, string callerId, string callerRole, CancellationToken cancellationToken = default);
}
