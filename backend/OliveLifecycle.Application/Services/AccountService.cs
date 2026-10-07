using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.User;
using OliveLifecycle.Application.Extensions;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class AccountService : IAccountService
{
    public const string DefaultSupportEmail = "support@theolivelot.com";
    /// <summary>Target window to permanently purge archived grove residuals after account closure.</summary>
    public const int AccountDataPurgeDays = 30;
    /// <summary>Encrypted backups may retain residual copies up to this many days.</summary>
    public const int BackupRetentionDays = 90;
    private const int MinimumPasswordLength = 8;
    private const int EmailCodeHours = 1;
    private const int MaxNameLength = 80;

    private readonly IUserRepository _users;
    private readonly IFieldRepository _fields;
    private readonly IUserNotificationRepository _notifications;
    private readonly IDevicePushTokenRepository? _pushTokens;
    private readonly ISavedContactRepository? _savedContacts;
    private readonly IDateTimeProvider _clock;
    private readonly IConfiguration _configuration;
    private readonly IEmailSender? _emailSender;

    public AccountService(
        IUserRepository users,
        IFieldRepository fields,
        IUserNotificationRepository notifications,
        IDateTimeProvider clock,
        IConfiguration configuration,
        IEmailSender? emailSender = null,
        IDevicePushTokenRepository? pushTokens = null,
        ISavedContactRepository? savedContacts = null)
    {
        _users = users;
        _fields = fields;
        _notifications = notifications;
        _pushTokens = pushTokens;
        _savedContacts = savedContacts;
        _clock = clock;
        _configuration = configuration;
        _emailSender = emailSender;
    }

    public async Task<UserDto> UpdateProfileAsync(
        string userId,
        UpdateProfileDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await RequireActiveUserAsync(userId, cancellationToken);
        var first = (dto.FirstName ?? string.Empty).Trim();
        var last = (dto.LastName ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(first))
        {
            throw new ValidationException("Enter your first name.");
        }

        if (first.Length > MaxNameLength || last.Length > MaxNameLength)
        {
            throw new ValidationException("Name must be at most 80 characters.");
        }

        user.FirstName = first;
        user.LastName = string.IsNullOrEmpty(last) ? null : last;
        user.UpdatedAt = _clock.UtcNow;
        await _users.UpdateAsync(user, cancellationToken);
        return UserMapper.ToDto(user);
    }

    public async Task ChangePasswordAsync(
        string userId,
        ChangePasswordDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await RequireActiveUserAsync(userId, cancellationToken);
        if (!PasswordMatches(dto.CurrentPassword, user.PasswordHash))
        {
            throw new ValidationException("Current password is incorrect.");
        }

        var next = dto.NewPassword ?? string.Empty;
        if (next.Length < MinimumPasswordLength)
        {
            throw new ValidationException("Password must be at least 8 characters.");
        }

        if (PasswordMatches(next, user.PasswordHash))
        {
            throw new ValidationException("New password must be different from the current password.");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(next);
        user.PasswordResetTokenHash = null;
        user.PasswordResetExpiresAt = null;
        user.UpdatedAt = _clock.UtcNow;
        await _users.UpdateAsync(user, cancellationToken);
    }

    public async Task<RequestEmailChangeResponseDto> RequestEmailChangeAsync(
        string userId,
        RequestEmailChangeDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await RequireActiveUserAsync(userId, cancellationToken);
        if (!PasswordMatches(dto.CurrentPassword, user.PasswordHash))
        {
            throw new ValidationException("Current password is incorrect.");
        }

        var email = NormalizeEmail(dto.NewEmail);
        if (!IsValidEmail(email))
        {
            throw new ValidationException("Enter a valid email address.");
        }

        if (string.Equals(email, user.Email, StringComparison.Ordinal))
        {
            throw new ValidationException("That's already your email.");
        }

        if (await _users.ExistsByEmailAsync(email, cancellationToken))
        {
            throw new ValidationException("That email is already in use.");
        }

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        user.PendingEmail = email;
        user.EmailChangeTokenHash = HashSecret(code);
        user.EmailChangeExpiresAt = _clock.UtcNow.AddHours(EmailCodeHours);
        user.UpdatedAt = _clock.UtcNow;
        await _users.UpdateAsync(user, cancellationToken);

        var subject = "The Olive Lot — επιβεβαίωση email / email verification";
        var body =
            $"Κωδικός επιβεβαίωσης για το νέο email του λογαριασμού The Olive Lot: {code}\n" +
            $"Verification code for your new The Olive Lot email: {code}\n\n" +
            $"Ο κωδικός ισχύει για {EmailCodeHours} ώρα.\n" +
            $"This code expires in {EmailCodeHours} hour.\n\n" +
            "Αν δεν το ζητήσατε εσείς, αγνοήστε αυτό το μήνυμα.\n" +
            "If you did not request this, you can ignore this message.";

        if (_emailSender != null)
        {
            await _emailSender.SendAsync(email, subject, body, cancellationToken);
        }

        var response = new RequestEmailChangeResponseDto
        {
            Sent = true,
            PendingEmail = email
        };
        var expose = string.Equals(
            _configuration["Email:ExposeDevResetLink"],
            "true",
            StringComparison.OrdinalIgnoreCase);
        if (expose && _emailSender?.IsConfigured != true)
        {
            response.DevCode = code;
        }

        return response;
    }

    public async Task<UserDto> ConfirmEmailChangeAsync(
        string userId,
        ConfirmEmailChangeDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await RequireActiveUserAsync(userId, cancellationToken);
        var code = (dto.Code ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(user.PendingEmail)
            || string.IsNullOrEmpty(user.EmailChangeTokenHash)
            || user.EmailChangeExpiresAt is null
            || user.EmailChangeExpiresAt < _clock.UtcNow
            || !FixedEquals(user.EmailChangeTokenHash, HashSecret(code)))
        {
            throw new ValidationException("This verification code is invalid or has expired.");
        }

        if (await _users.ExistsByEmailAsync(user.PendingEmail, cancellationToken))
        {
            throw new ValidationException("That email is already in use.");
        }

        user.Email = user.PendingEmail;
        user.PendingEmail = null;
        user.EmailChangeTokenHash = null;
        user.EmailChangeExpiresAt = null;
        user.UpdatedAt = _clock.UtcNow;
        await _users.UpdateAsync(user, cancellationToken);
        return UserMapper.ToDto(user);
    }

    public async Task<AccountExportDto> ExportAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await RequireActiveUserAsync(userId, cancellationToken);
        var fields = await _fields.GetByOwnerIdAsync(userId, cancellationToken);
        var notifications = await _notifications.GetByUserIdAsync(userId, 100, cancellationToken);
        var supportEmail = (_configuration["App:SupportEmail"] ?? DefaultSupportEmail).Trim();

        return new AccountExportDto
        {
            ExportedAt = _clock.UtcNow,
            Profile = new AccountProfileExportDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role.ToRoleName(),
                CreatedAt = user.CreatedAt
            },
            Preferences = UserPreferenceMapper.ToDto(user.Preferences),
            Fields = fields.Select(field => new AccountFieldExportDto
            {
                Id = field.Id,
                Name = field.Name,
                LocationText = field.LocationText,
                AreaHectares = field.Area,
                Variety = field.Variety,
                Status = field.Status.ToString()
            }).ToList(),
            Notifications = notifications.Select(item => new AccountNotificationExportDto
            {
                Id = item.Id,
                Type = item.Type,
                Title = item.Title,
                Message = item.Message,
                IsRead = item.IsRead,
                CreatedAt = item.CreatedAt
            }).ToList(),
            Support = new AccountSupportExportDto
            {
                Email = supportEmail,
                Purpose = "Request a correction, a complete archive (including photos and money records), or written confirmation that grove data was deleted."
            }
        };
    }

    public async Task DeleteAsync(string userId, DeleteAccountDto dto, CancellationToken cancellationToken = default)
    {
        var user = await RequireActiveUserAsync(userId, cancellationToken);
        if (!PasswordMatches(dto.CurrentPassword, user.PasswordHash))
        {
            throw new ValidationException("Current password is incorrect.");
        }

        var now = _clock.UtcNow;

        if (_pushTokens != null)
        {
            await _pushTokens.DeleteByUserIdAsync(userId, cancellationToken);
        }

        if (_savedContacts != null)
        {
            var contacts = await _savedContacts.GetByOwnerUserIdAsync(userId, cancellationToken);
            foreach (var contact in contacts)
            {
                await _savedContacts.DeleteAsync(contact.Id, cancellationToken);
            }
        }

        var notifications = await _notifications.GetByUserIdAsync(userId, 500, cancellationToken);
        foreach (var notification in notifications)
        {
            await _notifications.DeleteAsync(notification.Id, cancellationToken);
        }

        var ownedFields = (await _fields.GetByOwnerIdAsync(userId, cancellationToken)).ToList();
        var ownedIds = ownedFields.Select(f => f.Id).ToHashSet(StringComparer.Ordinal);
        foreach (var field in ownedFields)
        {
            field.Status = FieldStatus.Archived;
            field.People.RemoveAll(person =>
                string.Equals(person.UserId, userId, StringComparison.Ordinal));
            field.UpdatedAt = now;
            await _fields.UpdateAsync(field, cancellationToken);
        }

        var memberFields = await _fields.GetByMemberUserIdAsync(userId, cancellationToken);
        foreach (var field in memberFields)
        {
            if (ownedIds.Contains(field.Id))
            {
                continue;
            }

            var before = field.People.Count;
            field.People.RemoveAll(person =>
                string.Equals(person.UserId, userId, StringComparison.Ordinal));
            if (field.People.Count == before)
            {
                continue;
            }

            field.UpdatedAt = now;
            await _fields.UpdateAsync(field, cancellationToken);
        }

        user.Email = $"deleted.{user.Id}@deleted.theolivelot.invalid";
        user.FirstName = null;
        user.LastName = null;
        user.PendingEmail = null;
        user.EmailChangeTokenHash = null;
        user.EmailChangeExpiresAt = null;
        user.PasswordResetTokenHash = null;
        user.PasswordResetExpiresAt = null;
        user.Preferences = new UserExperiencePreferences();
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"));
        user.DeletedAt = now;
        user.UpdatedAt = now;
        await _users.UpdateAsync(user, cancellationToken);
    }

    private async Task<User> RequireActiveUserAsync(string userId, CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("User not found.");
        if (user.DeletedAt != null)
        {
            throw new ForbiddenException("This account is closed.");
        }

        return user;
    }

    private static string NormalizeEmail(string? email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    private static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 200 || !email.Contains('@'))
        {
            return false;
        }

        try
        {
            var parsed = new MailAddress(email);
            return string.Equals(parsed.Address, email, StringComparison.OrdinalIgnoreCase);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static bool PasswordMatches(string? password, string hash)
    {
        if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hash))
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

    private static string HashSecret(string value)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(value.Trim()));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static bool FixedEquals(string left, string right)
    {
        var a = Encoding.UTF8.GetBytes(left);
        var b = Encoding.UTF8.GetBytes(right);
        return a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);
    }
}
