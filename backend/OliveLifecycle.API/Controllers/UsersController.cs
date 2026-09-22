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
    private readonly IAccountService _accountService;

    public UsersController(IUserService userService, IAccountService accountService, ICurrentUserContext currentUser)
        : base(currentUser)
    {
        _userService = userService;
        _accountService = accountService;
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserDto>> UpdateMe([FromBody] UpdateProfileDto dto, CancellationToken cancellationToken)
    {
        var user = await _accountService.UpdateProfileAsync(UserContext.UserId, dto, cancellationToken);
        return OkResult(user);
    }

    [HttpPost("me/password")]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordDto dto, CancellationToken cancellationToken)
    {
        await _accountService.ChangePasswordAsync(UserContext.UserId, dto, cancellationToken);
        return Ok(new { changed = true });
    }

    [HttpPost("me/email")]
    public async Task<ActionResult<RequestEmailChangeResponseDto>> RequestEmailChange(
        [FromBody] RequestEmailChangeDto dto,
        CancellationToken cancellationToken)
    {
        var response = await _accountService.RequestEmailChangeAsync(UserContext.UserId, dto, cancellationToken);
        return OkResult(response);
    }

    [HttpPost("me/email/confirm")]
    public async Task<ActionResult<UserDto>> ConfirmEmailChange(
        [FromBody] ConfirmEmailChangeDto dto,
        CancellationToken cancellationToken)
    {
        var user = await _accountService.ConfirmEmailChangeAsync(UserContext.UserId, dto, cancellationToken);
        return OkResult(user);
    }

    [HttpGet("me/export")]
    public async Task<ActionResult<AccountExportDto>> ExportMe(CancellationToken cancellationToken)
    {
        var export = await _accountService.ExportAsync(UserContext.UserId, cancellationToken);
        return OkResult(export);
    }

    [HttpPost("me/deletion")]
    public async Task<ActionResult> DeleteMe([FromBody] DeleteAccountDto dto, CancellationToken cancellationToken)
    {
        await _accountService.DeleteAsync(UserContext.UserId, dto, cancellationToken);
        return Ok(new { deleted = true });
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
