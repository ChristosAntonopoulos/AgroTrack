using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Extensions;

public static class UserRoleExtensions
{
    public static string ToRoleName(this UserRole role) => role switch
    {
        UserRole.FieldOwner => Roles.FieldOwner,
        UserRole.Producer => Roles.Producer,
        UserRole.Agronomist => Roles.Agronomist,
        UserRole.Administrator => Roles.Administrator,
        UserRole.ServiceProvider => Roles.ServiceProvider,
        _ => Roles.Producer
    };

    public static UserRole FromRoleName(string? roleName) => roleName switch
    {
        Roles.FieldOwner => UserRole.FieldOwner,
        Roles.Producer => UserRole.Producer,
        Roles.Agronomist => UserRole.Agronomist,
        Roles.Administrator => UserRole.Administrator,
        Roles.ServiceProvider => UserRole.ServiceProvider,
        _ => UserRole.Producer
    };
}
