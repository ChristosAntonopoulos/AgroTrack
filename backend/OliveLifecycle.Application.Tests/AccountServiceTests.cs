using Microsoft.Extensions.Configuration;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.User;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class AccountServiceTests
{
    [Fact]
    public async Task UpdateProfileAsync_RequiresFirstName()
    {
        var service = CreateService(out var users, CreateUser());
        await Assert.ThrowsAsync<ValidationException>(() =>
            service.UpdateProfileAsync("user-1", new UpdateProfileDto { FirstName = "  ", LastName = "Papadakis" }));
        users.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfileAsync_SavesTrimmedName()
    {
        var stored = CreateUser();
        var service = CreateService(out var users, stored);

        var updated = await service.UpdateProfileAsync("user-1", new UpdateProfileDto
        {
            FirstName = "  Giorgos ",
            LastName = " Papadakis "
        });

        Assert.Equal("Giorgos", updated.FirstName);
        Assert.Equal("Papadakis", stored.LastName);
        users.Verify(r => r.UpdateAsync(stored, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ChangePasswordAsync_RejectsWrongCurrentPassword()
    {
        var service = CreateService(out _, CreateUser());
        await Assert.ThrowsAsync<ValidationException>(() =>
            service.ChangePasswordAsync("user-1", new ChangePasswordDto
            {
                CurrentPassword = "nope",
                NewPassword = "new-password-9"
            }));
    }

    [Fact]
    public async Task ChangePasswordAsync_UpdatesHash()
    {
        var stored = CreateUser();
        var previous = stored.PasswordHash;
        var service = CreateService(out _, stored);

        await service.ChangePasswordAsync("user-1", new ChangePasswordDto
        {
            CurrentPassword = "password123",
            NewPassword = "new-password-9"
        });

        Assert.NotEqual(previous, stored.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("new-password-9", stored.PasswordHash));
    }

    [Fact]
    public async Task RequestEmailChangeAsync_StoresHash_AndReturnsDevCodeWhenUnconfigured()
    {
        var stored = CreateUser();
        var email = new Mock<IEmailSender>();
        email.SetupGet(e => e.IsConfigured).Returns(false);
        email.Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var service = CreateService(out _, stored, exposeDevCode: true, email.Object);

        var response = await service.RequestEmailChangeAsync("user-1", new RequestEmailChangeDto
        {
            NewEmail = "Next@OliveFarm.com",
            CurrentPassword = "password123"
        });

        Assert.True(response.Sent);
        Assert.Equal("next@olivefarm.com", response.PendingEmail);
        Assert.Equal("next@olivefarm.com", stored.PendingEmail);
        Assert.False(string.IsNullOrWhiteSpace(stored.EmailChangeTokenHash));
        Assert.Equal(6, response.DevCode?.Length);
        email.Verify(
            e => e.SendAsync("next@olivefarm.com", It.IsAny<string>(), It.Is<string>(body => body.Contains(response.DevCode!)), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ConfirmEmailChangeAsync_AppliesPendingEmail()
    {
        var stored = CreateUser();
        var users = new Mock<IUserRepository>();
        users.Setup(r => r.GetByIdAsync("user-1", It.IsAny<CancellationToken>())).ReturnsAsync(stored);
        users.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        users.Setup(r => r.ExistsByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var service = Build(users, exposeDevCode: true);

        var requested = await service.RequestEmailChangeAsync("user-1", new RequestEmailChangeDto
        {
            NewEmail = "next@olivefarm.com",
            CurrentPassword = "password123"
        });

        var updated = await service.ConfirmEmailChangeAsync("user-1", new ConfirmEmailChangeDto
        {
            Code = requested.DevCode!
        });

        Assert.Equal("next@olivefarm.com", updated.Email);
        Assert.Null(stored.PendingEmail);
        Assert.Null(stored.EmailChangeTokenHash);
    }

    [Fact]
    public async Task DeleteAsync_ClosesLogin_AndKeepsSupportPathInExport()
    {
        var stored = CreateUser();
        var ownedField = new Field
        {
            Id = "field-1",
            OwnerId = "user-1",
            Name = "North",
            Area = 1.2,
            Status = FieldStatus.Active
        };
        var fields = new Mock<IFieldRepository>();
        fields.Setup(r => r.GetByOwnerIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { ownedField });
        fields.Setup(r => r.GetByMemberUserIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());
        fields.Setup(r => r.UpdateAsync(It.IsAny<Field>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Field f, CancellationToken _) => f);
        var notifications = new Mock<IUserNotificationRepository>();
        notifications.Setup(r => r.GetByUserIdAsync("user-1", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<UserNotification>
            {
                new()
                {
                    Id = "n1",
                    Type = "task_approval",
                    Title = "Approval waiting",
                    Message = "Check the spray",
                    UserId = "user-1"
                }
            });
        notifications.Setup(r => r.DeleteAsync("n1", It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var users = new Mock<IUserRepository>();
        users.Setup(r => r.GetByIdAsync("user-1", It.IsAny<CancellationToken>())).ReturnsAsync(stored);
        users.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        var service = Build(users, fields.Object, notifications.Object, exposeDevCode: false);

        var export = await service.ExportAsync("user-1");
        Assert.Equal(AccountService.DefaultSupportEmail, export.Support.Email);
        Assert.Contains("correction", export.Support.Purpose, StringComparison.OrdinalIgnoreCase);
        Assert.Single(export.Fields);
        Assert.Equal("task_approval", export.Notifications[0].Type);

        await service.DeleteAsync("user-1", new DeleteAccountDto { CurrentPassword = "password123" });

        Assert.NotNull(stored.DeletedAt);
        Assert.Null(stored.FirstName);
        Assert.StartsWith("deleted.", stored.Email, StringComparison.Ordinal);
        Assert.False(BCrypt.Net.BCrypt.Verify("password123", stored.PasswordHash));
        Assert.Equal(FieldStatus.Archived, ownedField.Status);
        notifications.Verify(r => r.DeleteAsync("n1", It.IsAny<CancellationToken>()), Times.Once);
    }

    private static AccountService CreateService(
        out Mock<IUserRepository> users,
        User stored,
        bool exposeDevCode = false,
        IEmailSender? email = null)
    {
        users = new Mock<IUserRepository>();
        users.Setup(r => r.GetByIdAsync(stored.Id, It.IsAny<CancellationToken>())).ReturnsAsync(stored);
        users.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        users.Setup(r => r.ExistsByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        return Build(users, exposeDevCode: exposeDevCode, email: email);
    }

    private static AccountService Build(
        Mock<IUserRepository> users,
        IFieldRepository? fields = null,
        IUserNotificationRepository? notifications = null,
        bool exposeDevCode = false,
        IEmailSender? email = null)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Email:ExposeDevResetLink"] = exposeDevCode ? "true" : "false"
            })
            .Build();
        return new AccountService(
            users.Object,
            fields ?? Mock.Of<IFieldRepository>(),
            notifications ?? Mock.Of<IUserNotificationRepository>(),
            new SystemDateTimeProvider(),
            configuration,
            email);
    }

    private static User CreateUser() => new()
    {
        Id = "user-1",
        Email = "owner@olivefarm.com",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
        Role = UserRole.FieldOwner,
        FirstName = "Giorgos",
        LastName = "Papadakis"
    };
}
