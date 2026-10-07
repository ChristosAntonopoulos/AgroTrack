using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Auth;
using OliveLifecycle.Application.Extensions;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class AuthService : IAuthService
{
    private const int PasswordResetHours = 1;
    private const int MinimumPasswordLength = 8;

    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IFieldPeopleService? _fieldPeople;
    private readonly IEmailSender? _emailSender;

    public AuthService(
        IUserRepository userRepository,
        IConfiguration configuration,
        IDateTimeProvider dateTimeProvider,
        IFieldPeopleService? fieldPeople = null,
        IEmailSender? emailSender = null)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _dateTimeProvider = dateTimeProvider;
        _fieldPeople = fieldPeople;
        _emailSender = emailSender;
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
            if (_fieldPeople == null)
            {
                throw new ValidationException("Invitation codes are not available.");
            }

            var invite = await _fieldPeople.GetInviteAsync(inviteCode, cancellationToken);
            if (invite == null
                || !string.Equals(invite.Status, FamilyInviteStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException("This invitation code is not valid.");
            }

            if (!string.IsNullOrWhiteSpace(invite.Email)
                && !string.Equals(invite.Email.Trim(), registerDto.Email, StringComparison.OrdinalIgnoreCase))
            {
                throw new ForbiddenException(
                    "Register with the email this invitation was sent to.",
                    FieldPeopleService.InviteEmailMismatchCode);
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
            LastLoginAt = now,
            LastSeenAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _userRepository.CreateAsync(user, cancellationToken);

        if (!string.IsNullOrWhiteSpace(inviteCode) && _fieldPeople != null)
        {
            await _fieldPeople.AcceptInviteAsync(inviteCode, created.Id, cancellationToken);
        }

        return GenerateAuthResponse(created);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto, CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(loginDto.Email);
        var user = await _userRepository.GetByEmailAsync(email, cancellationToken);
        if (user == null || user.DeletedAt != null || !PasswordMatches(loginDto.Password, user.PasswordHash))
        {
            throw new ForbiddenException("Invalid email or password.");
        }

        var now = _dateTimeProvider.UtcNow;
        user.LastLoginAt = now;
        user.LastSeenAt = now;
        user.UpdatedAt = now;
        await _userRepository.UpdateAsync(user, cancellationToken);

        return GenerateAuthResponse(user);
    }

    public async Task<ForgotPasswordResponseDto> ForgotPasswordAsync(
        ForgotPasswordDto dto,
        CancellationToken cancellationToken = default)
    {
        var response = new ForgotPasswordResponseDto { Sent = true };
        var email = NormalizeEmail(dto.Email);
        var user = await _userRepository.GetByEmailAsync(email, cancellationToken);
        if (user == null)
        {
            return response;
        }

        var token = CreateResetToken();
        user.PasswordResetTokenHash = HashResetToken(token);
        user.PasswordResetExpiresAt = _dateTimeProvider.UtcNow.AddHours(PasswordResetHours);
        user.UpdatedAt = _dateTimeProvider.UtcNow;
        await _userRepository.UpdateAsync(user, cancellationToken);

        var publicBase = (_configuration["App:PublicWebBaseUrl"] ?? "http://localhost:3000").TrimEnd('/');
        var resetUrl = $"{publicBase}/reset-password?token={Uri.EscapeDataString(token)}";
        var subject = "The Olive Lot — επαναφορά κωδικού / password reset";
        var body =
            $"Λάβαμε αίτημα επαναφοράς κωδικού για τον λογαριασμό The Olive Lot.\n" +
            $"We received a request to reset the password for your The Olive Lot account.\n\n" +
            $"{resetUrl}\n\n" +
            $"Ο σύνδεσμος ισχύει για {PasswordResetHours} ώρα.\n" +
            $"This link expires in {PasswordResetHours} hour.\n\n" +
            "Αν δεν το ζητήσατε εσείς, αγνοήστε αυτό το μήνυμα.\n" +
            "If you did not request this, you can ignore this message.";

        if (_emailSender != null)
        {
            await _emailSender.SendAsync(user.Email, subject, body, cancellationToken);
        }

        var exposeDevLink = string.Equals(
            _configuration["Email:ExposeDevResetLink"],
            "true",
            StringComparison.OrdinalIgnoreCase);
        if (exposeDevLink && _emailSender?.IsConfigured != true)
        {
            response.DevResetToken = token;
        }

        return response;
    }

    public async Task ResetPasswordAsync(ResetPasswordDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < MinimumPasswordLength)
        {
            throw new ValidationException("Password must be at least 8 characters.");
        }

        var token = dto.Token?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(token))
        {
            throw new ValidationException("This reset link is invalid or has expired.");
        }

        var user = await _userRepository.GetByPasswordResetTokenHashAsync(
            HashResetToken(token),
            cancellationToken);

        if (user == null)
        {
            throw new ValidationException("This reset link is invalid or has expired.");
        }

        if (user.PasswordResetExpiresAt is null || user.PasswordResetExpiresAt < _dateTimeProvider.UtcNow)
        {
            user.PasswordResetTokenHash = null;
            user.PasswordResetExpiresAt = null;
            user.UpdatedAt = _dateTimeProvider.UtcNow;
            await _userRepository.UpdateAsync(user, cancellationToken);
            throw new ValidationException("This reset link is invalid or has expired.");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        user.PasswordResetTokenHash = null;
        user.PasswordResetExpiresAt = null;
        user.UpdatedAt = _dateTimeProvider.UtcNow;
        await _userRepository.UpdateAsync(user, cancellationToken);
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static string CreateResetToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string HashResetToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token.Trim()));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

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
            Preferences = UserPreferenceMapper.ToDto(user.Preferences)
        };
    }

    private static bool PasswordMatches(string password, string hash)
    {
        if (string.IsNullOrEmpty(hash))
        {
            return false;
        }

        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
        catch (Exception)
        {
            return false;
        }
    }
}
