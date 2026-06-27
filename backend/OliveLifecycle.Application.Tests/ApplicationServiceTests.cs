using Microsoft.Extensions.Configuration;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Auth;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FieldAccessServiceTests
{
    private readonly Mock<IFieldRepository> _fieldRepository = new();
    private readonly Mock<ITaskRepository> _taskRepository = new();
    private readonly FieldAccessService _service;

    public FieldAccessServiceTests()
    {
        _service = new FieldAccessService(_fieldRepository.Object, _taskRepository.Object);
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

public class WorkTaskStatusTests
{
    [Theory]
    [InlineData("pending", WorkTaskStatus.Pending)]
    [InlineData("in_progress", WorkTaskStatus.InProgress)]
    [InlineData("completed", WorkTaskStatus.Completed)]
    [InlineData("cancelled", WorkTaskStatus.Cancelled)]
    public void FromApiString_ParsesKnownValues(string input, WorkTaskStatus expected)
    {
        Assert.Equal(expected, WorkTaskStatusExtensions.FromApiString(input));
    }

    [Theory]
    [InlineData(WorkTaskStatus.Pending, "pending")]
    [InlineData(WorkTaskStatus.InProgress, "in_progress")]
    [InlineData(WorkTaskStatus.Completed, "completed")]
    public void ToApiString_ReturnsExpectedValue(WorkTaskStatus status, string expected)
    {
        Assert.Equal(expected, status.ToApiString());
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
