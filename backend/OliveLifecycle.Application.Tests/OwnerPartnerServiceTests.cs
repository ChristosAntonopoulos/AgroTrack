using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.OwnerPartner;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class OwnerPartnerServiceTests
{
    private readonly Mock<IOwnerPartnerLinkRepository> _links = new();
    private readonly Mock<IOwnerPartnerInviteRepository> _invites = new();
    private readonly Mock<IFamilyInviteRepository> _familyInvites = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly OwnerPartnerService _service;
    private readonly DateTime _now = new(2026, 9, 11, 12, 0, 0, DateTimeKind.Utc);

    public OwnerPartnerServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(_now);
        _fields.Setup(r => r.GetByOwnerIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Field> { new() { Id = "field-1", OwnerId = "owner-1", Name = "Grove" } });
        _fields.Setup(r => r.GetByMemberUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());
        _users.Setup(r => r.GetByIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "owner-1", Email = "owner@test.com", FirstName = "Nikos", LastName = "Owner" });
        _invites.Setup(r => r.GetPendingByOwnerUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<OwnerPartnerInvite>());
        _familyInvites.Setup(r => r.GetByTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FamilyInvite?)null);
        _service = new OwnerPartnerService(
            _links.Object,
            _invites.Object,
            _familyInvites.Object,
            _fields.Object,
            _users.Object,
            _clock.Object,
            NullLogger<OwnerPartnerService>.Instance);
    }

    [Fact]
    public async Task CreateInviteAsync_CreatesPendingLinkAndInvite()
    {
        _links.Setup(r => r.CountOccupiedSeatsAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _links.Setup(r => r.CreateAsync(It.IsAny<OwnerPartnerLink>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OwnerPartnerLink m, CancellationToken _) =>
            {
                m.Id = "link-1";
                return m;
            });
        _invites.Setup(r => r.CreateAsync(It.IsAny<OwnerPartnerInvite>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OwnerPartnerInvite i, CancellationToken _) =>
            {
                i.Id = "invite-1";
                return i;
            });
        _invites.Setup(r => r.GetByTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OwnerPartnerInvite?)null);

        var invite = await _service.CreateInviteAsync("owner-1", new CreateOwnerPartnerInviteDto
        {
            DisplayName = "Kostas",
            Phone = "6944123456",
            Modules = ["fields", "tasks"],
            AccessLevel = "work"
        }, "https://app.oleachron.app");

        Assert.Equal("invite-1", invite.Id);
        Assert.Contains("/partner-invite/", invite.ShareUrl);
        Assert.False(string.IsNullOrWhiteSpace(invite.Code));
    }

    [Fact]
    public async Task CreateInviteAsync_RejectsWhenSeatOccupied()
    {
        _links.Setup(r => r.CountOccupiedSeatsAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateInviteAsync(
            "owner-1",
            new CreateOwnerPartnerInviteDto
            {
                DisplayName = "Kostas",
                Email = "k@test.com",
                Modules = ["fields"],
                AccessLevel = "view"
            },
            null));

        Assert.Equal("You can add 1 partner.", ex.Message);
    }

    [Fact]
    public async Task AcceptInviteAsync_LinksUserAndActivates()
    {
        var invite = new OwnerPartnerInvite
        {
            Id = "invite-1",
            Token = "abc",
            Code = "ABCD1234",
            LinkId = "link-1",
            OwnerUserId = "owner-1",
            Status = FamilyInviteStatuses.Pending,
            ExpiresAt = _now.AddDays(1),
            Modules = ["fields"],
            AccessLevel = "view"
        };
        var link = new OwnerPartnerLink
        {
            Id = "link-1",
            OwnerUserId = "owner-1",
            Status = FamilyMemberStatuses.Pending,
            DisplayName = "Kostas"
        };

        _invites.Setup(r => r.GetByTokenAsync("abc", It.IsAny<CancellationToken>())).ReturnsAsync(invite);
        _links.Setup(r => r.GetByIdAsync("link-1", It.IsAny<CancellationToken>())).ReturnsAsync(link);
        _links.Setup(r => r.GetByOwnerUserIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<OwnerPartnerLink> { link });
        _links.Setup(r => r.UpdateAsync(It.IsAny<OwnerPartnerLink>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OwnerPartnerLink l, CancellationToken _) => l);
        _invites.Setup(r => r.UpdateAsync(It.IsAny<OwnerPartnerInvite>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OwnerPartnerInvite i, CancellationToken _) => i);

        var result = await _service.AcceptInviteAsync("abc", "user-2");

        Assert.Equal(FamilyMemberStatuses.Active, result.Status);
        Assert.Equal("user-2", result.LinkedUserId);
    }

    [Fact]
    public async Task RevokeLinkAsync_FreesSeat()
    {
        var link = new OwnerPartnerLink
        {
            Id = "link-1",
            OwnerUserId = "owner-1",
            Status = FamilyMemberStatuses.Active,
            InviteId = "invite-1"
        };
        _links.Setup(r => r.GetByIdAsync("link-1", It.IsAny<CancellationToken>())).ReturnsAsync(link);
        _links.Setup(r => r.UpdateAsync(It.IsAny<OwnerPartnerLink>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OwnerPartnerLink l, CancellationToken _) => l);
        _invites.Setup(r => r.GetByIdAsync("invite-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OwnerPartnerInvite
            {
                Id = "invite-1",
                Status = FamilyInviteStatuses.Accepted
            });

        await _service.RevokeLinkAsync("owner-1", "link-1");

        Assert.Equal(FamilyMemberStatuses.Revoked, link.Status);
    }
}
