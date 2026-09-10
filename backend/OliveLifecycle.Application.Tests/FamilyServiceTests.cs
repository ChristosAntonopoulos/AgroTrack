using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Family;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FamilyServiceTests
{
    private readonly Mock<IFamilyCircleRepository> _circles = new();
    private readonly Mock<IFamilyMemberRepository> _members = new();
    private readonly Mock<IFamilyInviteRepository> _invites = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly FamilyService _service;
    private readonly DateTime _now = new(2026, 9, 8, 12, 0, 0, DateTimeKind.Utc);

    public FamilyServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(_now);
        _fields.Setup(r => r.GetByOwnerIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Field> { new() { Id = "field-1", OwnerId = "owner-1", Name = "Grove" } });
        _fields.Setup(r => r.GetByMemberUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());
        _users.Setup(r => r.GetByIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "owner-1", Email = "owner@test.com", FirstName = "Nikos", LastName = "Owner" });
        _circles.Setup(r => r.GetByOwnerUserIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FamilyCircle { Id = "circle-1", OwnerUserId = "owner-1" });
        _invites.Setup(r => r.GetPendingByCircleIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FamilyInvite>());
        _service = new FamilyService(
            _circles.Object,
            _members.Object,
            _invites.Object,
            _fields.Object,
            _users.Object,
            _clock.Object,
            NullLogger<FamilyService>.Instance);
    }

    [Fact]
    public async Task CreateInviteAsync_CreatesPendingMemberAndInvite()
    {
        _members.Setup(r => r.CountOccupiedSeatsAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _members.Setup(r => r.CreateAsync(It.IsAny<FamilyMember>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FamilyMember m, CancellationToken _) =>
            {
                m.Id = "member-1";
                return m;
            });
        _invites.Setup(r => r.CreateAsync(It.IsAny<FamilyInvite>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FamilyInvite i, CancellationToken _) =>
            {
                i.Id = "invite-1";
                return i;
            });

        var invite = await _service.CreateInviteAsync("owner-1", new CreateFamilyInviteDto
        {
            DisplayName = "Maria",
            Phone = "6944123456",
            Modules = ["fields", "tasks"],
            AccessLevel = "view"
        }, "https://app.oleachron.app");

        Assert.Equal("invite-1", invite.Id);
        Assert.False(string.IsNullOrWhiteSpace(invite.Code));
        Assert.Matches(@"^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$", invite.Code);
        Assert.Contains("/family-invite/", invite.ShareUrl);
        Assert.Contains("wa.me", invite.WhatsAppUrl);
        Assert.Contains("mailto:", invite.MailtoUrl);
        _members.Verify(r => r.CreateAsync(
            It.Is<FamilyMember>(m => m.Status == FamilyMemberStatuses.Pending && m.OwnerUserId == "owner-1"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateInviteAsync_RejectsWhenTwoSeatsOccupied()
    {
        _members.Setup(r => r.CountOccupiedSeatsAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CreateInviteAsync("owner-1", new CreateFamilyInviteDto
            {
                DisplayName = "Maria",
                Email = "maria@test.com",
                Modules = ["fields"],
                AccessLevel = "view"
            }, null));
    }

    [Fact]
    public async Task CreateInviteAsync_RequiresPhoneOrEmail()
    {
        _members.Setup(r => r.CountOccupiedSeatsAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CreateInviteAsync("owner-1", new CreateFamilyInviteDto
            {
                DisplayName = "Maria",
                Modules = ["fields"],
                AccessLevel = "view"
            }, null));
    }

    [Fact]
    public async Task AcceptInviteAsync_LinksUserAndActivatesMember()
    {
        _invites.Setup(r => r.GetByTokenAsync("tok", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FamilyInvite
            {
                Id = "invite-1",
                Token = "tok",
                MemberId = "member-1",
                OwnerUserId = "owner-1",
                CircleId = "circle-1",
                Status = FamilyInviteStatuses.Pending,
                ExpiresAt = _now.AddDays(7),
                Modules = ["fields", "tasks"],
                AccessLevel = "help"
            });
        _members.Setup(r => r.GetByIdAsync("member-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FamilyMember
            {
                Id = "member-1",
                OwnerUserId = "owner-1",
                CircleId = "circle-1",
                DisplayName = "Maria",
                Status = FamilyMemberStatuses.Pending,
                Modules = ["fields"]
            });
        _members.Setup(r => r.GetActiveByLinkedUserIdAsync("user-2", It.IsAny<CancellationToken>()))
            .ReturnsAsync((FamilyMember?)null);

        var member = await _service.AcceptInviteAsync("tok", "user-2");

        Assert.Equal(FamilyMemberStatuses.Active, member.Status);
        Assert.Equal("user-2", member.LinkedUserId);
        Assert.Contains("tasks", member.Modules);
        _members.Verify(r => r.UpdateAsync(
            It.Is<FamilyMember>(m => m.Status == FamilyMemberStatuses.Active && m.LinkedUserId == "user-2"),
            It.IsAny<CancellationToken>()), Times.Once);
        _invites.Verify(r => r.UpdateAsync(
            It.Is<FamilyInvite>(i => i.Status == FamilyInviteStatuses.Accepted && i.AcceptedBy == "user-2"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RevokeMemberAsync_FreesSeat()
    {
        _members.Setup(r => r.GetByIdAsync("member-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FamilyMember
            {
                Id = "member-1",
                OwnerUserId = "owner-1",
                Status = FamilyMemberStatuses.Pending,
                InviteId = "invite-1",
                DisplayName = "Maria"
            });
        _invites.Setup(r => r.GetByIdAsync("invite-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FamilyInvite
            {
                Id = "invite-1",
                Status = FamilyInviteStatuses.Pending
            });

        await _service.RevokeMemberAsync("owner-1", "member-1");

        _members.Verify(r => r.UpdateAsync(
            It.Is<FamilyMember>(m => m.Status == FamilyMemberStatuses.Revoked),
            It.IsAny<CancellationToken>()), Times.Once);
        _invites.Verify(r => r.UpdateAsync(
            It.Is<FamilyInvite>(i => i.Status == FamilyInviteStatuses.Revoked),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetMineAsync_ForbidsNonOwner()
    {
        _fields.Setup(r => r.GetByOwnerIdAsync("stranger", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());
        _fields.Setup(r => r.GetByMemberUserIdAsync("stranger", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());

        await Assert.ThrowsAsync<ForbiddenException>(() => _service.GetMineAsync("stranger"));
    }
}

public class FamilyAccessServiceTests
{
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldTaskRepository> _fieldTasks = new();
    private readonly Mock<IFamilyMemberRepository> _family = new();
    private readonly FieldAccessService _service;

    public FamilyAccessServiceTests()
    {
        _service = new FieldAccessService(_fields.Object, _fieldTasks.Object, _family.Object);
    }

    [Fact]
    public async Task CanUserAccessFieldAsync_AllowsActiveFamilyWithFieldsModule()
    {
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });
        _family.Setup(r => r.GetActiveByLinkedUserIdAllAsync("family-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FamilyMember>
            {
                new()
                {
                    Id = "m1",
                    OwnerUserId = "owner-1",
                    LinkedUserId = "family-1",
                    Status = FamilyMemberStatuses.Active,
                    Modules = [FamilyModules.Fields, FamilyModules.Tasks],
                    AccessLevel = FamilyAccessLevels.View
                }
            });

        var ok = await _service.CanUserAccessFieldAsync("field-1", "family-1", "FieldOwner");

        Assert.True(ok);
    }

    [Fact]
    public async Task CanUserAccessFieldAsync_DeniesFamilyWithoutFieldsModule()
    {
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });
        _family.Setup(r => r.GetActiveByLinkedUserIdAllAsync("family-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FamilyMember>
            {
                new()
                {
                    Id = "m1",
                    OwnerUserId = "owner-1",
                    LinkedUserId = "family-1",
                    Status = FamilyMemberStatuses.Active,
                    Modules = [FamilyModules.Money],
                    AccessLevel = FamilyAccessLevels.View
                }
            });
        _fieldTasks.Setup(r => r.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Core.Entities.FieldWork.FieldTask>());

        var ok = await _service.CanUserAccessFieldAsync("field-1", "family-1", "FieldOwner");

        Assert.False(ok);
    }

    [Fact]
    public async Task CanUserAccessFieldDocumentsAsync_AllowsFamilyWithDocumentsModule()
    {
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });
        _family.Setup(r => r.GetActiveByLinkedUserIdAllAsync("family-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FamilyMember>
            {
                new()
                {
                    Id = "m1",
                    OwnerUserId = "owner-1",
                    LinkedUserId = "family-1",
                    Status = FamilyMemberStatuses.Active,
                    Modules = [FamilyModules.Documents],
                    AccessLevel = FamilyAccessLevels.Work
                }
            });

        var ok = await _service.CanUserAccessFieldDocumentsAsync("field-1", "family-1", "FieldOwner");

        Assert.True(ok);
    }

    [Fact]
    public async Task CanUserModifyFieldAsync_NeverAllowsFamily()
    {
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });

        var ok = await _service.CanUserModifyFieldAsync("field-1", "family-1");

        Assert.False(ok);
    }
}
