using OliveLifecycle.Application.DTOs.User;
using OliveLifecycle.Infrastructure.Repositories;

namespace OliveLifecycle.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository userRepository, ILogger<UserService> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task<IEnumerable<UserDto>> GetUsersByRoleAsync(string? role)
    {
        IEnumerable<Core.Entities.User> users;
        
        if (!string.IsNullOrEmpty(role))
        {
            users = await _userRepository.GetByRoleAsync(role);
        }
        else
        {
            // If no role specified, get common roles (Producer and FieldOwner)
            var allUsers = new List<Core.Entities.User>();
            var producers = await _userRepository.GetByRoleAsync("Producer");
            var fieldOwners = await _userRepository.GetByRoleAsync("FieldOwner");
            allUsers.AddRange(producers);
            allUsers.AddRange(fieldOwners);
            users = allUsers;
        }
        
        return users.Select(MapToDto);
    }

    public async Task<UserDto?> GetUserByIdAsync(string id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        return user != null ? MapToDto(user) : null;
    }

    private static UserDto MapToDto(Core.Entities.User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role
        };
    }
}
