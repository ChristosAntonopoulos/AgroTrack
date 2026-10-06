using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FieldPeopleInviteIdentityTests
{
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IFieldInviteRepository> _invites = new();
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly Mock<ISavedContactService> _contacts = new();
    private readonly Mock<IUserNotificationService> _notifications = new();
    private readonly Mock<IPushNotificationSender> _push = new();
    private readonly Mock<ILoggerFake> _logger = new();
    private readonly FieldPeopleService _service;

    public FieldPeopleInviteIdentityTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 9, 30, 8, 0, 0, DateTimeKind.Utc));
        _access.Setup(a => a.CanUserModifyFieldAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        _service = new FieldPeopleService(
            _fields.Object,
            _users.Object,
            Mock.Of<IFieldTaskRepository>(),
            Mock.Of<IActivityRepository>(),
            _invites.Object,
            _access.Object,
            _clock.Object,
            _contacts.Object,
            _notifications.Object,
            _push.Object,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<FieldPeopleService>.Instance);
    }

    [Fact]
    public async Task CreateInvite_ExistingEmail_QueuesNotification()
    {
        var field = AdminField();
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>())).ReturnsAsync(field);
        _fields.Setup(r => r.UpdateAsync(It.IsAny<Field>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Field f, CancellationToken _) => f);
        _users.Setup(r => r.GetByIdAsync("admin-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "admin-1", Email = "admin@example.com", FirstName = "Admin" });
        _users.Setup(r => r.GetByEmailAsync("elena@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "user-elena", Email = "elena@example.com" });
        _invites.Setup(r => r.CreateAsync(It.IsAny<FieldInvite>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldInvite invite, CancellationToken _) =>
            {
                invite.Id = "invite-1";
                return invite;
            });
        _invites.Setup(r => r.GetByCodeAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldInvite?)null);
        _notifications.Setup(n => n.NotifyAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _push.Setup(p => p.SendToUserAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<IReadOnlyDictionary<string, string>?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _service.CreateInviteAsync(
            "field-1",
            "admin-1",
            new CreateFieldInviteDto
            {
                Role = "Family",
                Email = "elena@example.com",
                DisplayName = "Elena",
                Modules = ["chronologio", "photos"],
                AccessLevel = "view"
            },
            "https://theolivelot.com");

        Assert.True(result.InviteeHasAccount);
        Assert.Equal("user-elena", result.TargetUserId);
        Assert.True(result.NotificationQueued);
        _notifications.Verify(n => n.NotifyAsync(
            It.Is<UserNotification>(x => x.UserId == "user-elena" && x.Type == "field_invite"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AcceptInvite_WrongEmail_ThrowsMismatch()
    {
        var invite = new FieldInvite
        {
            Id = "invite-1",
            Token = "tok",
            Code = "ABCD1234",
            FieldId = "field-1",
            FieldName = "Grove",
            Email = "elena@example.com",
            Status = FamilyInviteStatuses.Pending,
            ExpiresAt = _clock.Object.UtcNow.AddDays(3),
            Role = FieldPersonRole.Family,
            Modules = ["chronologio"],
            AccessLevel = FamilyAccessLevels.View
        };
        _invites.Setup(r => r.GetByTokenAsync("tok", It.IsAny<CancellationToken>())).ReturnsAsync(invite);
        _users.Setup(r => r.GetByIdAsync("other", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "other", Email = "other@example.com" });

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.AcceptInviteAsync("tok", "other"));

        Assert.Equal(FieldPeopleService.InviteEmailMismatchCode, ex.Code);
    }

    [Fact]
    public async Task AcceptInvite_MatchingEmail_ActivatesSeat()
    {
        var field = AdminField();
        FieldPeopleRules.AddOrReplaceSeat(
            field,
            FieldPersonRole.Family,
            userId: null,
            ["chronologio"],
            FamilyAccessLevels.View,
            "admin-1",
            "Elena",
            "elena@example.com",
            inviteId: "invite-1",
            status: FamilyMemberStatuses.Pending);

        var invite = new FieldInvite
        {
            Id = "invite-1",
            Token = "tok",
            FieldId = "field-1",
            FieldName = "Grove",
            Email = "elena@example.com",
            Status = FamilyInviteStatuses.Pending,
            ExpiresAt = _clock.Object.UtcNow.AddDays(3),
            Role = FieldPersonRole.Family,
            Modules = ["chronologio"],
            AccessLevel = FamilyAccessLevels.View,
            InvitedBy = "admin-1"
        };

        _invites.Setup(r => r.GetByTokenAsync("tok", It.IsAny<CancellationToken>())).ReturnsAsync(invite);
        _invites.Setup(r => r.UpdateAsync(It.IsAny<FieldInvite>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldInvite i, CancellationToken _) => i);
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>())).ReturnsAsync(field);
        _fields.Setup(r => r.UpdateAsync(It.IsAny<Field>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Field f, CancellationToken _) => f);
        _users.Setup(r => r.GetByIdAsync("user-elena", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "user-elena", Email = "elena@example.com", FirstName = "Elena" });
        _contacts.Setup(c => c.LinkOnInviteAcceptedAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var seat = await _service.AcceptInviteAsync("tok", "user-elena");

        Assert.Equal("user-elena", seat.UserId);
        Assert.Equal(FamilyMemberStatuses.Active, seat.Status);
    }

    private static Field AdminField()
    {
        var field = new Field
        {
            Id = "field-1",
            OwnerId = "admin-1",
            Name = "Grove",
            Status = FieldStatus.Active
        };
        FieldPeopleRules.AddOrReplaceSeat(
            field,
            FieldPersonRole.Admin,
            "admin-1",
            FamilyModules.All,
            FamilyAccessLevels.Work,
            "admin-1",
            status: FamilyMemberStatuses.Active);
        return field;
    }

    // Avoid unused type warning for earlier draft.
    private interface ILoggerFake { }
}
