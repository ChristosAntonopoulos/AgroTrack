using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.User;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;

namespace OliveLifecycle.API.Controllers;

[Authorize]
[Route("api/v1/users")]
public class UsersController : BaseApiController
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _userService = userService;
    }

    [HttpGet("me/preferences")]
    public async Task<ActionResult<UserExperiencePreferencesDto>> GetMyPreferences(CancellationToken cancellationToken)
    {
        var prefs = await _userService.GetPreferencesAsync(UserContext.UserId, cancellationToken);
        return OkResult(prefs);
    }

    [HttpPut("me/preferences")]
    public async Task<ActionResult<UserExperiencePreferencesDto>> UpdateMyPreferences(
        [FromBody] UpdateUserPreferencesDto dto,
        CancellationToken cancellationToken)
    {
        var prefs = await _userService.UpdatePreferencesAsync(UserContext.UserId, dto, cancellationToken);
        return OkResult(prefs);
    }

    [HttpGet]
    [Authorize(Policy = PolicyNames.CanManageUsers)]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers([FromQuery] string? role, CancellationToken cancellationToken)
    {
        var users = await _userService.GetUsersByRoleAsync(role, UserContext.UserId, UserContext.Role, cancellationToken);
        return OkResult(users);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetUser(string id, CancellationToken cancellationToken)
    {
        var user = await _userService.GetUserByIdAsync(id, UserContext.UserId, UserContext.Role, cancellationToken);
        if (user == null)
        {
            return NotFound();
        }

        return OkResult(user);
    }
}
