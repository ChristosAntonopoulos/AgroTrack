using OliveLifecycle.Application.DTOs.User;
using OliveLifecycle.Application.Extensions;
using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Mappings;

public static class UserMapper
{
    public static UserDto ToDto(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Role = user.Role.ToRoleName()
    };
}
