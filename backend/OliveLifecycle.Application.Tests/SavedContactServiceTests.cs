using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Partners;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class SavedContactServiceTests
{
    private readonly Mock<ISavedContactRepository> _contacts = new();
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IFieldInviteRepository> _invites = new();
    private readonly Mock<IServiceContactRequestRepository> _requests = new();
    private readonly Mock<IServiceProviderProfileRepository> _profiles = new();
    private readonly SavedContactService _service;

    public SavedContactServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 9, 8, 12, 0, 0, DateTimeKind.Utc));
        _fields.Setup(r => r.GetByMemberUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());
        _fields.Setup(r => r.GetByOwnerIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());
        _invites.Setup(r => r.GetByInvitedByAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldInvite>());
        _requests.Setup(r => r.GetByRequesterUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<ServiceContactRequest>());
        _service = new SavedContactService(
            _contacts.Object,
            _access.Object,
            _clock.Object,
            _fields.Object,
            _users.Object,
            _invites.Object,
            _requests.Object,
            _profiles.Object);
    }

    [Fact]
    public async Task CreateAsync_SavesPrivateContactForOwner()
    {
        _access.Setup(a => a.CanUserAccessFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _contacts.Setup(r => r.CreateAsync(It.IsAny<SavedContact>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SavedContact c, CancellationToken _) =>
            {
                c.Id = "contact-1";
                return c;
            });

        var created = await _service.CreateAsync("owner-1", Roles.FieldOwner, new UpsertSavedContactDto
        {
            DisplayName = "  Nikos  ",
            Phone = " 6944123456 ",
            FieldIds = ["field-1"],
            Source = "PhoneBook"
        });

        Assert.Equal("contact-1", created.Id);
        Assert.Equal("Nikos", created.DisplayName);
        Assert.Equal("6944123456", created.Phone);
        Assert.Equal("PhoneBook", created.Source);
        Assert.Equal(["field-1"], created.FieldIds);
        Assert.Null(created.LinkedUserId);
        _contacts.Verify(r => r.CreateAsync(
            It.Is<SavedContact>(c => c.OwnerUserId == "owner-1" && c.Source == SavedContactSource.PhoneBook),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_RequiresName()
    {
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CreateAsync("owner-1", Roles.FieldOwner, new UpsertSavedContactDto
            {
                DisplayName = "  "
            }));
    }

    [Fact]
    public async Task CreateAsync_AllowsNameOnlyForLaterDetails()
    {
        _contacts.Setup(r => r.CreateAsync(It.IsAny<SavedContact>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SavedContact c, CancellationToken _) =>
            {
                c.Id = "contact-2";
                return c;
            });

        var created = await _service.CreateAsync("owner-1", Roles.FieldOwner, new UpsertSavedContactDto
        {
            DisplayName = "Mill"
        });

        Assert.Equal("Mill", created.DisplayName);
        Assert.Null(created.Phone);
        Assert.Empty(created.FieldIds);
    }

    [Fact]
    public async Task CreateAsync_RejectsFieldTheUserCannotAccess()
    {
        _access.Setup(a => a.CanUserAccessFieldAsync("field-x", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.CreateAsync("owner-1", Roles.FieldOwner, new UpsertSavedContactDto
            {
                DisplayName = "Nikos",
                FieldIds = ["field-x"]
            }));

        _contacts.Verify(r => r.CreateAsync(It.IsAny<SavedContact>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_LinksWhenEmailMatchesFieldMember()
    {
        _fields.Setup(r => r.GetByOwnerIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Field>
            {
                new()
                {
                    Id = "field-1",
                    OwnerId = "owner-1",
                    Memberships =
                    [
                        new FieldMembership { UserId = "owner-1", Status = "active" },
                        new FieldMembership { UserId = "pruner-1", Status = "active" }
                    ]
                }
            });
        _users.Setup(r => r.GetByIdAsync("pruner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "pruner-1", Email = "nikos@grove.gr" });
        _contacts.Setup(r => r.CreateAsync(It.IsAny<SavedContact>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SavedContact c, CancellationToken _) =>
            {
                c.Id = "contact-link";
                return c;
            });

        var created = await _service.CreateAsync("owner-1", Roles.FieldOwner, new UpsertSavedContactDto
        {
            DisplayName = "Nikos",
            Email = "nikos@grove.gr"
        });

        Assert.Equal("pruner-1", created.LinkedUserId);
        _users.Verify(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_DoesNotLinkUnknownEmail()
    {
        _fields.Setup(r => r.GetByOwnerIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Field>
            {
                new()
                {
                    Id = "field-1",
                    OwnerId = "owner-1",
                    Memberships = [new FieldMembership { UserId = "pruner-1", Status = "active" }]
                }
            });
        _users.Setup(r => r.GetByIdAsync("pruner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "pruner-1", Email = "nikos@grove.gr" });
        _users.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "stranger", Email = "hidden@elsewhere.gr" });
        _contacts.Setup(r => r.CreateAsync(It.IsAny<SavedContact>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SavedContact c, CancellationToken _) => c);

        var created = await _service.CreateAsync("owner-1", Roles.FieldOwner, new UpsertSavedContactDto
        {
            DisplayName = "Stranger",
            Email = "hidden@elsewhere.gr"
        });

        Assert.Null(created.LinkedUserId);
        _users.Verify(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_IgnoresClientSuppliedLinkedUserId()
    {
        _contacts.Setup(r => r.CreateAsync(It.IsAny<SavedContact>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SavedContact c, CancellationToken _) => c);

        var created = await _service.CreateAsync("owner-1", Roles.FieldOwner, new UpsertSavedContactDto
        {
            DisplayName = "Nikos",
            LinkedUserId = "someone-else"
        });

        Assert.Null(created.LinkedUserId);
    }

    [Fact]
    public async Task CreateAsync_LinksWhenPhoneMatchesAcceptedInvite()
    {
        _invites.Setup(r => r.GetByInvitedByAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FieldInvite>
            {
                new()
                {
                    InvitedBy = "owner-1",
                    Status = "accepted",
                    AcceptedBy = "worker-1",
                    Phone = "+30 6944 123456"
                }
            });
        _users.Setup(r => r.GetByIdAsync("worker-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "worker-1", Email = "worker@grove.gr" });
        _contacts.Setup(r => r.CreateAsync(It.IsAny<SavedContact>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SavedContact c, CancellationToken _) => c);

        var created = await _service.CreateAsync("owner-1", Roles.FieldOwner, new UpsertSavedContactDto
        {
            DisplayName = "Kostas",
            Phone = "6944123456"
        });

        Assert.Equal("worker-1", created.LinkedUserId);
    }

    [Fact]
    public async Task GetMineAsync_DoesNotReturnAnotherUsersContacts()
    {
        _contacts.Setup(r => r.GetByOwnerUserIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<SavedContact>
            {
                new() { Id = "mine", OwnerUserId = "owner-1", DisplayName = "Nikos", FieldIds = ["field-1"] }
            });

        var result = await _service.GetMineAsync("owner-1", null, false);

        Assert.Single(result);
        Assert.Equal("mine", result[0].Id);
        _contacts.Verify(r => r.GetByOwnerUserIdAsync("owner-1", It.IsAny<CancellationToken>()), Times.Once);
        _contacts.Verify(r => r.GetByOwnerUserIdAsync("owner-2", It.IsAny<CancellationToken>()), Times.Never);
        _contacts.Verify(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetMineAsync_FiltersByFieldAndCanIncludeUnassigned()
    {
        _contacts.Setup(r => r.GetByOwnerUserIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<SavedContact>
            {
                new() { Id = "on-field", OwnerUserId = "owner-1", DisplayName = "Pruner", FieldIds = ["field-1"] },
                new() { Id = "other-field", OwnerUserId = "owner-1", DisplayName = "Mill", FieldIds = ["field-2"] },
                new() { Id = "loose", OwnerUserId = "owner-1", DisplayName = "Cousin", FieldIds = [] }
            });

        var linkedOnly = await _service.GetMineAsync("owner-1", "field-1", false);
        Assert.Single(linkedOnly);
        Assert.Equal("on-field", linkedOnly[0].Id);

        var withUnassigned = await _service.GetMineAsync("owner-1", "field-1", true);
        Assert.Equal(2, withUnassigned.Count);
        Assert.Contains(withUnassigned, c => c.Id == "on-field");
        Assert.Contains(withUnassigned, c => c.Id == "loose");
    }

    [Fact]
    public async Task UpdateAsync_ForbidsOtherOwners()
    {
        _contacts.Setup(r => r.GetByIdAsync("contact-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SavedContact
            {
                Id = "contact-1",
                OwnerUserId = "owner-2",
                DisplayName = "Secret"
            });

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.UpdateAsync("owner-1", Roles.FieldOwner, "contact-1", new UpsertSavedContactDto
            {
                DisplayName = "Hacked"
            }));
    }

    [Fact]
    public async Task DeleteAsync_ForbidsOtherOwners()
    {
        _contacts.Setup(r => r.GetByIdAsync("contact-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SavedContact
            {
                Id = "contact-1",
                OwnerUserId = "owner-2",
                DisplayName = "Secret"
            });

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.DeleteAsync("owner-1", "contact-1"));

        _contacts.Verify(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_OwnerCanRemove()
    {
        _contacts.Setup(r => r.GetByIdAsync("contact-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SavedContact
            {
                Id = "contact-1",
                OwnerUserId = "owner-1",
                DisplayName = "Nikos"
            });
        _contacts.Setup(r => r.DeleteAsync("contact-1", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await _service.DeleteAsync("owner-1", "contact-1");

        _contacts.Verify(r => r.DeleteAsync("contact-1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task LinkOnInviteAccepted_MatchesPhoneWithoutLeakingOthers()
    {
        var stored = new SavedContact
        {
            Id = "c1",
            OwnerUserId = "owner-1",
            DisplayName = "Nikos",
            Phone = "6944123456"
        };
        _contacts.Setup(r => r.GetByOwnerUserIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<SavedContact> { stored });
        _contacts.Setup(r => r.UpdateAsync(It.IsAny<SavedContact>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SavedContact c, CancellationToken _) => c);

        await _service.LinkOnInviteAcceptedAsync("owner-1", "user-9", "6944123456", null);

        _contacts.Verify(r => r.UpdateAsync(
            It.Is<SavedContact>(c => c.Id == "c1" && c.LinkedUserId == "user-9"),
            It.IsAny<CancellationToken>()), Times.Once);
        _contacts.Verify(r => r.GetByOwnerUserIdAsync("owner-2", It.IsAny<CancellationToken>()), Times.Never);
        _users.Verify(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
