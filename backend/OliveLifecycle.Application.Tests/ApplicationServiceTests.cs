using Microsoft.Extensions.Configuration;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Auth;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FieldAccessServiceTests
{
    private readonly Mock<IFieldRepository> _fieldRepository = new();
    private readonly FieldAccessService _service;

    public FieldAccessServiceTests()
    {
        var subscriptions = new Mock<ISubscriptionService>();
        subscriptions.Setup(s => s.IsOwnedFieldWritableAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _service = new FieldAccessService(_fieldRepository.Object, subscriptions.Object);
    }

    [Fact]
    public async Task CanUserAccessFieldAsync_ReturnsTrue_ForOwner()
    {
        _fieldRepository.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });

        var result = await _service.CanUserAccessFieldAsync("field-1", "owner-1", Roles.Producer);

        Assert.True(result);
    }

    [Fact]
    public async Task CanUserAccessFieldAsync_ReturnsTrue_ForAdministrator()
    {
        _fieldRepository.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });

        var result = await _service.CanUserAccessFieldAsync("field-1", "admin-1", Roles.Administrator);

        Assert.True(result);
    }

    [Fact]
    public async Task CanUserAccessFieldAsync_ReturnsTrue_ForAssignedProducer()
    {
        var field = new Field { Id = "field-1", OwnerId = "owner-1" };
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Admin, "owner-1", FamilyModules.All, FamilyAccessLevels.Work, "owner-1",
            status: FamilyMemberStatuses.Active);
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Partner, "producer-1", FamilyModules.DefaultOnInvite, FamilyAccessLevels.Work, "owner-1",
            status: FamilyMemberStatuses.Active);
        _fieldRepository.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(field);

        var result = await _service.CanUserAccessFieldAsync("field-1", "producer-1", Roles.Producer);

        Assert.True(result);
    }

    [Fact]
    public async Task CanUserAccessFieldAsync_ReturnsFalse_ForAssignedProducerWithoutSeat()
    {
        _fieldRepository.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });

        var result = await _service.CanUserAccessFieldAsync("field-1", "producer-1", Roles.Producer);

        Assert.False(result);
    }

    [Fact]
    public async Task CanUserAccessFieldModuleAsync_RequiresPhotosSeat()
    {
        var field = new Field { Id = "field-1", OwnerId = "owner-1" };
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Admin, "owner-1", FamilyModules.All, FamilyAccessLevels.Work, "owner-1",
            status: FamilyMemberStatuses.Active);
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Partner, "producer-1", [FamilyModules.Fields, FamilyModules.Tasks], FamilyAccessLevels.Work, "owner-1",
            status: FamilyMemberStatuses.Active);
        _fieldRepository.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(field);

        Assert.False(await _service.CanUserAccessFieldPhotosAsync("field-1", "producer-1", Roles.Producer));
        Assert.True(await _service.CanUserAccessFieldModuleAsync("field-1", "producer-1", Roles.Producer, FamilyModules.Tasks));
    }

    [Fact]
    public async Task CanUserAccessFieldAsync_ReturnsFalse_WhenFieldMissing()
    {
        _fieldRepository.Setup(r => r.GetByIdAsync("missing", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Field?)null);

        var result = await _service.CanUserAccessFieldAsync("missing", "user-1", Roles.Producer);

        Assert.False(result);
    }

    [Fact]
    public async Task CanUserModifyFieldAsync_ReturnsTrue_ForOwner()
    {
        _fieldRepository.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });

        var result = await _service.CanUserModifyFieldAsync("field-1", "owner-1");

        Assert.True(result);
    }

    [Fact]
    public async Task CanUserModifyFieldAsync_ReturnsFalse_ForNonOwner()
    {
        _fieldRepository.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });

        var result = await _service.CanUserModifyFieldAsync("field-1", "other-user");

        Assert.False(result);
    }
}

public class AuthServiceTests
{
    [Fact]
    public async Task RegisterAsync_RejectsAdministratorRole()
    {
        var userRepository = new Mock<IUserRepository>();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT:SecretKey"] = "test-secret-key-at-least-32-characters-long",
                ["JWT:Issuer"] = "test",
                ["JWT:Audience"] = "test"
            })
            .Build();

        var service = new AuthService(userRepository.Object, configuration, new SystemDateTimeProvider());

        await Assert.ThrowsAsync<ValidationException>(() => service.RegisterAsync(new RegisterDto
        {
            Email = "admin@test.com",
            Password = "password123",
            Role = Roles.Administrator,
            FirstName = "Admin",
            LastName = "User"
        }));
    }

    [Fact]
    public async Task RegisterAsync_RejectsAgronomistRole()
    {
        var userRepository = new Mock<IUserRepository>();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT:SecretKey"] = "test-secret-key-at-least-32-characters-long",
                ["JWT:Issuer"] = "test",
                ["JWT:Audience"] = "test"
            })
            .Build();

        var service = new AuthService(userRepository.Object, configuration, new SystemDateTimeProvider());

        await Assert.ThrowsAsync<ValidationException>(() => service.RegisterAsync(new RegisterDto
        {
            Email = "agro@test.com",
            Password = "password123",
            Role = Roles.Agronomist,
            FirstName = "Agro",
            LastName = "User"
        }));
    }

    [Fact]
    public async Task RegisterAsync_UsesPersistedUserId()
    {
        const string persistedId = "507f1f77bcf86cd799439011";
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(r => r.ExistsByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        userRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => new User
            {
                Id = persistedId,
                Email = u.Email,
                PasswordHash = u.PasswordHash,
                Role = u.Role,
                FirstName = u.FirstName,
                LastName = u.LastName,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt
            });

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT:SecretKey"] = "test-secret-key-at-least-32-characters-long",
                ["JWT:Issuer"] = "test",
                ["JWT:Audience"] = "test"
            })
            .Build();

        var service = new AuthService(userRepository.Object, configuration, new SystemDateTimeProvider());
        var response = await service.RegisterAsync(new RegisterDto
        {
            Email = "grower@test.com",
            Password = "password123",
            Role = Roles.FieldOwner,
            FirstName = "Maria",
            LastName = "Grower"
        });

        Assert.Equal(persistedId, response.UserId);
        Assert.False(string.IsNullOrWhiteSpace(response.Token));
    }

    [Fact]
    public async Task RegisterAsync_AssignsFieldOwner_WhenProducerRequested()
    {
        var created = default(User);
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(r => r.ExistsByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        userRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback<User, CancellationToken>((u, _) => created = u)
            .ReturnsAsync((User u, CancellationToken _) =>
            {
                u.Id = "507f1f77bcf86cd799439012";
                return u;
            });

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT:SecretKey"] = "test-secret-key-at-least-32-characters-long",
                ["JWT:Issuer"] = "test",
                ["JWT:Audience"] = "test"
            })
            .Build();

        var service = new AuthService(userRepository.Object, configuration, new SystemDateTimeProvider());
        var response = await service.RegisterAsync(new RegisterDto
        {
            Email = "worker@test.com",
            Password = "password123",
            Role = Roles.Producer,
            FirstName = "Kostas",
            LastName = "Worker"
        });

        Assert.Equal(UserRole.FieldOwner, created!.Role);
        Assert.Equal(Roles.FieldOwner, response.Role);
    }

    [Fact]
    public async Task RegisterAsync_AssignsFieldOwner_WhenRoleOmitted()
    {
        var created = default(User);
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(r => r.ExistsByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        userRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback<User, CancellationToken>((u, _) => created = u)
            .ReturnsAsync((User u, CancellationToken _) =>
            {
                u.Id = "507f1f77bcf86cd799439013";
                return u;
            });

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT:SecretKey"] = "test-secret-key-at-least-32-characters-long",
                ["JWT:Issuer"] = "test",
                ["JWT:Audience"] = "test"
            })
            .Build();

        var service = new AuthService(userRepository.Object, configuration, new SystemDateTimeProvider());
        var response = await service.RegisterAsync(new RegisterDto
        {
            Email = "user@test.com",
            Password = "password123",
            FirstName = "Maria",
            LastName = "User"
        });

        Assert.Equal(UserRole.FieldOwner, created!.Role);
        Assert.Equal(Roles.FieldOwner, response.Role);
    }

    [Fact]
    public async Task LoginAsync_StampsLastLoginAndLastSeen()
    {
        var now = new DateTime(2026, 10, 7, 12, 0, 0, DateTimeKind.Utc);
        var clock = new Mock<IDateTimeProvider>();
        clock.Setup(c => c.UtcNow).Returns(now);

        var password = "password123";
        var user = new User
        {
            Id = "507f1f77bcf86cd799439020",
            Email = "grower@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = UserRole.FieldOwner,
            FirstName = "Maria",
            LastName = "Grower"
        };

        User? updated = null;
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(r => r.GetByEmailAsync("grower@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        userRepository
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback<User, CancellationToken>((u, _) => updated = u)
            .ReturnsAsync((User u, CancellationToken _) => u);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT:SecretKey"] = "test-secret-key-at-least-32-characters-long",
                ["JWT:Issuer"] = "test",
                ["JWT:Audience"] = "test",
                ["JWT:ExpirationMinutes"] = "60"
            })
            .Build();

        var service = new AuthService(userRepository.Object, configuration, clock.Object);
        var response = await service.LoginAsync(new LoginDto
        {
            Email = "grower@test.com",
            Password = password
        });

        Assert.False(string.IsNullOrWhiteSpace(response.Token));
        Assert.NotNull(updated);
        Assert.Equal(now, updated!.LastLoginAt);
        Assert.Equal(now, updated.LastSeenAt);
    }

    [Fact]
    public async Task RegisterAsync_AcceptsPendingFieldInvite()
    {
        const string persistedId = "507f1f77bcf86cd799439014";
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(r => r.ExistsByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        userRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) =>
            {
                u.Id = persistedId;
                return u;
            });

        var fieldPeople = new Mock<IFieldPeopleService>();
        fieldPeople
            .Setup(f => f.GetInviteAsync("AB12-CD34", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DTOs.Field.FieldInviteDto
            {
                Status = FamilyInviteStatuses.Pending,
                Code = "AB12-CD34",
                Role = FieldPersonRole.Family.ToString()
            });
        fieldPeople
            .Setup(f => f.AcceptInviteAsync("AB12-CD34", persistedId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DTOs.Field.FieldMembershipDto
            {
                Status = FamilyMemberStatuses.Active,
                UserId = persistedId,
                Role = FieldPersonRole.Family.ToString()
            });

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT:SecretKey"] = "test-secret-key-at-least-32-characters-long",
                ["JWT:Issuer"] = "test",
                ["JWT:Audience"] = "test"
            })
            .Build();

        var service = new AuthService(
            userRepository.Object,
            configuration,
            new SystemDateTimeProvider(),
            fieldPeople.Object);

        var response = await service.RegisterAsync(new RegisterDto
        {
            Email = "family@test.com",
            Password = "password123",
            FirstName = "Maria",
            LastName = "Member",
            InviteCode = "AB12-CD34"
        });

        Assert.Equal(persistedId, response.UserId);
        fieldPeople.Verify(
            f => f.AcceptInviteAsync("AB12-CD34", persistedId, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_RejectsUnknownInviteCode()
    {
        var userRepository = new Mock<IUserRepository>();
        var fieldPeople = new Mock<IFieldPeopleService>();
        fieldPeople
            .Setup(f => f.GetInviteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DTOs.Field.FieldInviteDto?)null);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT:SecretKey"] = "test-secret-key-at-least-32-characters-long",
                ["JWT:Issuer"] = "test",
                ["JWT:Audience"] = "test"
            })
            .Build();

        var service = new AuthService(
            userRepository.Object,
            configuration,
            new SystemDateTimeProvider(),
            fieldPeople.Object);

        await Assert.ThrowsAsync<ValidationException>(() => service.RegisterAsync(new RegisterDto
        {
            Email = "family@test.com",
            Password = "password123",
            InviteCode = "ZZZZ-ZZZZ"
        }));

        userRepository.Verify(
            r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ForgotPasswordAsync_UnknownEmail_StillSucceeds_AndDoesNotSend()
    {
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        var email = new Mock<IEmailSender>();
        email.SetupGet(e => e.IsConfigured).Returns(false);

        var service = new AuthService(
            userRepository.Object,
            PasswordResetConfig(),
            new SystemDateTimeProvider(),
            emailSender: email.Object);

        var response = await service.ForgotPasswordAsync(new ForgotPasswordDto { Email = "missing@test.com" });

        Assert.True(response.Sent);
        Assert.Null(response.DevResetToken);
        email.Verify(
            e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
        userRepository.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ForgotPasswordAsync_KnownEmail_StoresHash_AndReturnsDevTokenWhenUnconfigured()
    {
        var stored = CreateResetUser();
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(r => r.GetByEmailAsync("grower@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(stored);
        userRepository
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        var email = new Mock<IEmailSender>();
        email.SetupGet(e => e.IsConfigured).Returns(false);
        email
            .Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var service = new AuthService(
            userRepository.Object,
            PasswordResetConfig(),
            new SystemDateTimeProvider(),
            emailSender: email.Object);

        var response = await service.ForgotPasswordAsync(new ForgotPasswordDto { Email = "Grower@test.com" });

        Assert.True(response.Sent);
        Assert.False(string.IsNullOrWhiteSpace(response.DevResetToken));
        Assert.False(string.IsNullOrWhiteSpace(stored.PasswordResetTokenHash));
        Assert.NotNull(stored.PasswordResetExpiresAt);
        email.Verify(
            e => e.SendAsync("grower@test.com", It.IsAny<string>(), It.Is<string>(body => body.Contains(response.DevResetToken!)), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ForgotPasswordAsync_DoesNotReturnDevToken_WhenSmtpConfigured()
    {
        var stored = CreateResetUser();
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(r => r.GetByEmailAsync("grower@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(stored);
        userRepository
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        var email = new Mock<IEmailSender>();
        email.SetupGet(e => e.IsConfigured).Returns(true);
        email
            .Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var service = new AuthService(
            userRepository.Object,
            PasswordResetConfig(),
            new SystemDateTimeProvider(),
            emailSender: email.Object);

        var response = await service.ForgotPasswordAsync(new ForgotPasswordDto { Email = "grower@test.com" });

        Assert.True(response.Sent);
        Assert.Null(response.DevResetToken);
    }

    [Fact]
    public async Task ResetPasswordAsync_ValidToken_UpdatesHash_AndClearsToken()
    {
        const string token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        var stored = CreateResetUser();
        var previousHash = stored.PasswordHash;
        stored.PasswordResetTokenHash = HashToken(token);
        stored.PasswordResetExpiresAt = DateTime.UtcNow.AddMinutes(30);

        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(r => r.GetByPasswordResetTokenHashAsync(stored.PasswordResetTokenHash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(stored);
        userRepository
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var service = new AuthService(
            userRepository.Object,
            PasswordResetConfig(),
            new SystemDateTimeProvider());

        await service.ResetPasswordAsync(new ResetPasswordDto
        {
            Token = token,
            Password = "new-password-9"
        });

        Assert.NotEqual(previousHash, stored.PasswordHash);
        Assert.False(string.IsNullOrWhiteSpace(stored.PasswordHash));
        Assert.Null(stored.PasswordResetTokenHash);
        Assert.Null(stored.PasswordResetExpiresAt);
    }

    [Fact]
    public async Task ResetPasswordAsync_ExpiredToken_Throws()
    {
        const string token = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
        var now = new DateTime(2026, 9, 11, 12, 0, 0, DateTimeKind.Utc);
        var stored = CreateResetUser();
        stored.PasswordResetTokenHash = HashToken(token);
        stored.PasswordResetExpiresAt = now.AddMinutes(-1);

        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(r => r.GetByPasswordResetTokenHashAsync(stored.PasswordResetTokenHash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(stored);
        userRepository
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var clock = new Mock<IDateTimeProvider>();
        clock.SetupGet(c => c.UtcNow).Returns(now);

        var service = new AuthService(
            userRepository.Object,
            PasswordResetConfig(),
            clock.Object);

        var ex = await Assert.ThrowsAsync<ValidationException>(() => service.ResetPasswordAsync(new ResetPasswordDto
        {
            Token = token,
            Password = "new-password-9"
        }));

        Assert.Equal("This reset link is invalid or has expired.", ex.Message);
        Assert.Null(stored.PasswordResetTokenHash);
    }

    [Fact]
    public async Task ResetPasswordAsync_InvalidToken_Throws()
    {
        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(r => r.GetByPasswordResetTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var service = new AuthService(
            userRepository.Object,
            PasswordResetConfig(),
            new SystemDateTimeProvider());

        await Assert.ThrowsAsync<ValidationException>(() => service.ResetPasswordAsync(new ResetPasswordDto
        {
            Token = "missing-token",
            Password = "new-password-9"
        }));
    }

    private static IConfiguration PasswordResetConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT:SecretKey"] = "test-secret-key-at-least-32-characters-long",
                ["JWT:Issuer"] = "test",
                ["JWT:Audience"] = "test",
                ["Email:ExposeDevResetLink"] = "true",
                ["App:PublicWebBaseUrl"] = "http://localhost:3000"
            })
            .Build();

    private static User CreateResetUser() => new()
    {
        Id = "507f1f77bcf86cd799439020",
        Email = "grower@test.com",
        PasswordHash = "existing-hash",
        Role = UserRole.FieldOwner
    };

    private static string HashToken(string token)
    {
        var hash = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token.Trim()));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}

public class UserServiceTests
{
    [Fact]
    public async Task GetUsersByRoleAsync_ThrowsForbidden_ForProducer()
    {
        var userRepository = new Mock<IUserRepository>();
        var service = new UserService(userRepository.Object, Mock.Of<Microsoft.Extensions.Logging.ILogger<UserService>>());

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.GetUsersByRoleAsync(Roles.Producer, "producer-1", Roles.Producer));
    }

    [Fact]
    public async Task GetUserByIdAsync_ThrowsForbidden_ForUnrelatedProducer()
    {
        var userRepository = new Mock<IUserRepository>();
        var service = new UserService(userRepository.Object, Mock.Of<Microsoft.Extensions.Logging.ILogger<UserService>>());

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.GetUserByIdAsync("other-user", "producer-1", Roles.Producer));
    }

    [Fact]
    public async Task GetUserByIdAsync_AllowsSelfLookup()
    {
        var userRepository = new Mock<IUserRepository>();
        userRepository.Setup(r => r.GetByIdAsync("producer-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User
            {
                Id = "producer-1",
                Email = "p@test.com",
                Role = UserRole.Producer
            });

        var service = new UserService(userRepository.Object, Mock.Of<Microsoft.Extensions.Logging.ILogger<UserService>>());

        var user = await service.GetUserByIdAsync("producer-1", "producer-1", Roles.Producer);

        Assert.NotNull(user);
        Assert.Equal("producer-1", user!.Id);
    }
}

public class RolesTests
{
    [Theory]
    [InlineData(Roles.FieldOwner, true)]
    [InlineData(Roles.Producer, true)]
    [InlineData(Roles.Administrator, false)]
    [InlineData(Roles.Agronomist, false)]
    public void IsPublicRegistrationRole_ReturnsExpected(string role, bool allowed)
    {
        Assert.Equal(allowed, Roles.IsPublicRegistrationRole(role));
    }
}
