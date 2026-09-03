using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.DTOs.User;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Exceptions;

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

    public async Task<IEnumerable<UserDto>> GetUsersByRoleAsync(
        string? role,
        string callerId,
        string callerRole,
        CancellationToken cancellationToken = default)
    {
        if (callerRole != Roles.FieldOwner && callerRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to list users.");
        }

        IEnumerable<Core.Entities.User> users;

        if (!string.IsNullOrEmpty(role))
        {
            users = await _userRepository.GetByRoleAsync(role, cancellationToken);
        }
        else
        {
            var producers = await _userRepository.GetByRoleAsync(Roles.Producer, cancellationToken);
            var fieldOwners = await _userRepository.GetByRoleAsync(Roles.FieldOwner, cancellationToken);
            var agronomists = await _userRepository.GetByRoleAsync(Roles.Agronomist, cancellationToken);
            users = producers.Concat(fieldOwners).Concat(agronomists);
        }

        _logger.LogDebug("User {CallerId} listed users with role filter {Role}", callerId, role ?? "all");
        return users.Select(UserMapper.ToDto);
    }

    public async Task<UserDto?> GetUserByIdAsync(
        string id,
        string callerId,
        string callerRole,
        CancellationToken cancellationToken = default)
    {
        if (callerId != id && callerRole != Roles.Administrator && callerRole != Roles.FieldOwner)
        {
            throw new ForbiddenException("You do not have permission to view this user.");
        }

        var user = await _userRepository.GetByIdAsync(id, cancellationToken);
        return user == null ? null : UserMapper.ToDto(user);
    }

    public async Task<UserExperiencePreferencesDto> GetPreferencesAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("User not found.");
        return new UserExperiencePreferencesDto
        {
            ExperienceMode = user.Preferences.ExperienceMode,
            ExperienceModeChosen = user.Preferences.ExperienceModeChosen,
            FontScale = user.Preferences.FontScale,
            LargeControls = user.Preferences.LargeControls
        };
    }

    public async Task<UserExperiencePreferencesDto> UpdatePreferencesAsync(
        string userId,
        UpdateUserPreferencesDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("User not found.");

        if (!string.IsNullOrWhiteSpace(dto.ExperienceMode)
            && (dto.ExperienceMode == "everyday" || dto.ExperienceMode == "full"))
        {
            user.Preferences.ExperienceMode = dto.ExperienceMode;
        }

        if (dto.ExperienceModeChosen.HasValue)
        {
            user.Preferences.ExperienceModeChosen = dto.ExperienceModeChosen.Value;
        }

        if (!string.IsNullOrWhiteSpace(dto.FontScale)
            && (dto.FontScale is "default" or "large" or "xl"))
        {
            user.Preferences.FontScale = dto.FontScale;
        }

        if (dto.LargeControls.HasValue)
        {
            user.Preferences.LargeControls = dto.LargeControls.Value;
        }

        await _userRepository.UpdateAsync(user, cancellationToken);
        return await GetPreferencesAsync(userId, cancellationToken);
    }
}
