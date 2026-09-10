using Microsoft.Extensions.Configuration;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Auth;
using OliveLifecycle.Application.DTOs.Family;
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
    private readonly Mock<IFieldTaskRepository> _fieldTasks = new();
    private readonly Mock<IFamilyMemberRepository> _familyMembers = new();
    private readonly FieldAccessService _service;

    public FieldAccessServiceTests()
    {
        _familyMembers.Setup(r => r.GetActiveByLinkedUserIdAllAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FamilyMember>());
        _service = new FieldAccessService(_fieldRepository.Object, _fieldTasks.Object, _familyMembers.Object);
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
        _fieldRepository.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1", AssignedProducerIds = ["producer-1"] });

        var result = await _service.CanUserAccessFieldAsync("field-1", "producer-1", Roles.Producer);

        Assert.True(result);
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
    public async Task RegisterAsync_AcceptsPendingFamilyInvite()
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

        var family = new Mock<IFamilyService>();
        family
            .Setup(f => f.GetInviteAsync("AB12-CD34", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FamilyInviteShareDto
            {
                Status = FamilyInviteStatuses.Pending,
                Code = "AB12-CD34"
            });
        family
            .Setup(f => f.AcceptInviteAsync("AB12-CD34", persistedId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FamilyMemberDto
            {
                Status = FamilyMemberStatuses.Active,
                LinkedUserId = persistedId
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
            family.Object);

        var response = await service.RegisterAsync(new RegisterDto
        {
            Email = "family@test.com",
            Password = "password123",
            FirstName = "Maria",
            LastName = "Member",
            InviteCode = "AB12-CD34"
        });

        Assert.Equal(persistedId, response.UserId);
        family.Verify(
            f => f.AcceptInviteAsync("AB12-CD34", persistedId, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_RejectsUnknownInviteCode()
    {
        var userRepository = new Mock<IUserRepository>();
        var family = new Mock<IFamilyService>();
        family
            .Setup(f => f.GetInviteAsync(It.IsAny<string>(), null, It.IsAny<CancellationToken>()))
            .ReturnsAsync((FamilyInviteShareDto?)null);

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
            family.Object);

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
