using OliveLifecycle.Application.DTOs.User;

namespace OliveLifecycle.Application.Services;

public interface IUserService
{
    Task<IEnumerable<UserDto>> GetUsersByRoleAsync(string? role);
    Task<UserDto?> GetUserByIdAsync(string id);
}
