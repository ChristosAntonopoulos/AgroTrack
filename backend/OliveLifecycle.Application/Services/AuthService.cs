using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Auth;
using OliveLifecycle.Application.Extensions;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IFamilyService? _familyService;

    public AuthService(
        IUserRepository userRepository,
        IConfiguration configuration,
        IDateTimeProvider dateTimeProvider,
        IFamilyService? familyService = null)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _dateTimeProvider = dateTimeProvider;
        _familyService = familyService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto, CancellationToken cancellationToken = default)
    {
        registerDto.Email = NormalizeEmail(registerDto.Email);

        if (!string.IsNullOrWhiteSpace(registerDto.Role) &&
            !Roles.IsPublicRegistrationRole(registerDto.Role))
        {
            throw new ValidationException("Registration cannot assign a privileged role.");
        }

        var inviteCode = registerDto.InviteCode?.Trim();
        if (!string.IsNullOrWhiteSpace(inviteCode))
        {
            if (_familyService == null)
            {
                throw new ValidationException("Invitation codes are not available.");
            }

            var invite = await _familyService.GetInviteAsync(inviteCode, null, cancellationToken);
            if (invite == null
                || !string.Equals(invite.Status, FamilyInviteStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException("This invitation code is not valid.");
            }
        }

        if (await _userRepository.ExistsByEmailAsync(registerDto.Email, cancellationToken))
        {
            throw new ConflictException("User with this email already exists.");
        }

        var now = _dateTimeProvider.UtcNow;
        var user = new User
        {
            Email = registerDto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
            Role = UserRole.FieldOwner,
            FirstName = registerDto.FirstName,
            LastName = registerDto.LastName,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _userRepository.CreateAsync(user, cancellationToken);

        if (!string.IsNullOrWhiteSpace(inviteCode) && _familyService != null)
        {
            await _familyService.AcceptInviteAsync(inviteCode, created.Id, cancellationToken);
        }

        return GenerateAuthResponse(created);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto, CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(loginDto.Email);
        var user = await _userRepository.GetByEmailAsync(email, cancellationToken);
        if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
        {
            throw new ForbiddenException("Invalid email or password.");
        }

        return GenerateAuthResponse(user);
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private AuthResponseDto GenerateAuthResponse(User user)
    {
        var secretKey = _configuration["JWT:SecretKey"];
        var issuer = _configuration["JWT:Issuer"];
        var audience = _configuration["JWT:Audience"];
        var expirationMinutes = int.Parse(_configuration["JWT:ExpirationMinutes"] ?? "60");

        if (string.IsNullOrEmpty(secretKey))
        {
            throw new InvalidOperationException("JWT secret key is not configured.");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt = _dateTimeProvider.UtcNow.AddMinutes(expirationMinutes);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToRoleName()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            UserId = user.Id,
            Email = user.Email,
            Role = user.Role.ToRoleName(),
            ExpiresAt = expiresAt,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Preferences = new DTOs.User.UserExperiencePreferencesDto
            {
                ExperienceMode = user.Preferences.ExperienceMode,
                ExperienceModeChosen = user.Preferences.ExperienceModeChosen,
                FontScale = user.Preferences.FontScale,
                LargeControls = user.Preferences.LargeControls,
                Language = user.Preferences.Language
            }
        };
    }
}
