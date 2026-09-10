using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Partners;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.ValueObjects;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class PartnerServiceTests
{
    private readonly Mock<IServiceCategoryRepository> _categories = new();
    private readonly Mock<IServiceProviderProfileRepository> _profiles = new();
    private readonly Mock<IServiceContactRequestRepository> _requests = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldTaskRepository> _fieldTasks = new();
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly Mock<IUserNotificationService> _notifications = new();
    private readonly Mock<IActivityService> _activities = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly PartnerService _service;

    private static readonly ServiceCategory Pruning = new()
    {
        Id = "cat-pruning",
        Slug = "pruning",
        NameEn = "Pruning",
        NameEl = "Κλάδεμα",
        NameIt = "Potatura",
        IsActive = true,
        IsProminent = true
    };

    public PartnerServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc));
        _notifications.Setup(n => n.NotifyAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _activities.Setup(a => a.RecordAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<Dictionary<string, string>?>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _categories.Setup(r => r.GetAllAsync(It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<ServiceCategory> { Pruning });
        _service = new PartnerService(
            _categories.Object,
            _profiles.Object,
            _requests.Object,
            _users.Object,
            _fields.Object,
            _fieldTasks.Object,
            _access.Object,
            _notifications.Object,
            _activities.Object,
            _clock.Object,
            NullLogger<PartnerService>.Instance);
    }

    [Fact]
    public async Task ActivateAsync_CreatesProfileOnExistingUser()
    {
        _users.Setup(r => r.GetByIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "owner-1", Email = "owner@olivefarm.com", FirstName = "Giorgos", LastName = "Papadakis", Role = UserRole.FieldOwner });
        _profiles.Setup(r => r.GetByUserIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((ServiceProviderProfile?)null);
        _profiles.Setup(r => r.CreateAsync(It.IsAny<ServiceProviderProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ServiceProviderProfile p, CancellationToken _) =>
            {
                p.Id = "profile-1";
                return p;
            });
        _categories.Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ServiceCategory?)null);

        var profile = await _service.ActivateAsync("owner-1");

        Assert.Equal("owner-1", profile.UserId);
        Assert.Equal("Giorgos Papadakis", profile.DisplayName);
        Assert.False(profile.IsListed);
        Assert.False(profile.IsPaused);
        _profiles.Verify(r => r.CreateAsync(It.Is<ServiceProviderProfile>(p => p.UserId == "owner-1"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PauseAsync_UnlistsWithoutDeleting()
    {
        var stored = ListedProfile("owner-1");
        _profiles.Setup(r => r.GetByUserIdAsync("owner-1", It.IsAny<CancellationToken>())).ReturnsAsync(stored);
        _profiles.Setup(r => r.UpdateAsync(It.IsAny<ServiceProviderProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ServiceProviderProfile p, CancellationToken _) => p);

        var paused = await _service.PauseAsync("owner-1");

        Assert.True(paused.IsPaused);
        Assert.False(paused.IsListed);
    }

    [Fact]
    public async Task SearchAsync_UsesFieldCoordinatesAndOmitsSelf()
    {
        _access.Setup(a => a.CanUserAccessFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-1",
                OwnerId = "owner-1",
                Name = "Kato Horio",
                LocationText = "Peza",
                CenterPoint = new GeoJsonPoint { Coordinates = [25.14, 35.33] }
            });
        _categories.Setup(r => r.GetAllAsync(true, It.IsAny<CancellationToken>())).ReturnsAsync([Pruning]);
        _categories.Setup(r => r.GetByIdAsync("cat-pruning", It.IsAny<CancellationToken>())).ReturnsAsync(Pruning);

        var nearby = new List<NearbyProviderMatch>
        {
            new(ListedProfile("pruner-1"), 8.2),
            new(ListedProfile("owner-1"), 1.0)
        };
        _profiles.Setup(r => r.FindNearbyListedAsync(35.33, 25.14, 50, It.IsAny<CancellationToken>()))
            .ReturnsAsync(nearby);

        var result = await _service.SearchAsync("owner-1", Roles.FieldOwner, "field-1", "cat-pruning", null, 50, null, null, false);

        Assert.Single(result.Results);
        Assert.Equal("pruner-1", result.Results[0].UserId);
        Assert.Equal(8, result.Results[0].DistanceKm);
        Assert.Equal("Peza", result.FieldApproximateArea);
        Assert.True(result.CanExpandRadius);
        Assert.Equal(60, result.NextRadiusKm);
    }

    [Fact]
    public async Task SearchAsync_ParentCategoryIncludesChildListings()
    {
        var child = new ServiceCategory
        {
            Id = "cat-pruning-prod",
            Slug = "pruning-production",
            ParentCategoryId = Pruning.Id,
            NameEn = "Production pruning",
            IsActive = true
        };
        _access.Setup(a => a.CanUserAccessFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-1",
                OwnerId = "owner-1",
                Name = "Kato Horio",
                LocationText = "Peza",
                CenterPoint = new GeoJsonPoint { Coordinates = [25.14, 35.33] }
            });
        _categories.Setup(r => r.GetAllAsync(true, It.IsAny<CancellationToken>())).ReturnsAsync([Pruning, child]);
        _categories.Setup(r => r.GetByIdAsync("cat-pruning", It.IsAny<CancellationToken>())).ReturnsAsync(Pruning);

        var specialist = ListedProfile("specialist-1");
        specialist.ServiceCategoryIds = ["cat-pruning-prod"];
        _profiles.Setup(r => r.FindNearbyListedAsync(35.33, 25.14, 50, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new NearbyProviderMatch(specialist, 6)]);

        var result = await _service.SearchAsync("owner-1", Roles.FieldOwner, "field-1", "cat-pruning", null, 50, null, null, false);

        Assert.Single(result.Results);
        Assert.Equal("specialist-1", result.Results[0].UserId);
    }

    [Fact]
    public async Task SearchAsync_ThrowsWhenFieldHasNoLocation()
    {
        _access.Setup(a => a.CanUserAccessFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1", Name = "No pin" });

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.SearchAsync("owner-1", Roles.FieldOwner, "field-1", null, null, 25, null, null, false));
    }

    [Fact]
    public async Task ContactAsync_StoresApproximateAreaNotCoordinates()
    {
        _profiles.Setup(r => r.GetByUserIdAsync("pruner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(ListedProfile("pruner-1"));
        _categories.Setup(r => r.GetByIdAsync("cat-pruning", It.IsAny<CancellationToken>())).ReturnsAsync(Pruning);
        _access.Setup(a => a.CanUserAccessFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-1",
                OwnerId = "owner-1",
                Name = "Secret Grove",
                Area = 1.5,
                LocationText = "Archanes",
                CenterPoint = new GeoJsonPoint { Coordinates = [25.155, 35.312] }
            });
        _users.Setup(r => r.GetByIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "owner-1", FirstName = "Giorgos" });
        ServiceContactRequest? stored = null;
        _requests.Setup(r => r.CreateAsync(It.IsAny<ServiceContactRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ServiceContactRequest r, CancellationToken _) =>
            {
                stored = r;
                r.Id = "req-1";
                return r;
            });

        var dto = await _service.ContactAsync("owner-1", Roles.FieldOwner, "pruner-1", new CreatePartnerContactDto
        {
            ServiceCategoryId = "cat-pruning",
            FieldId = "field-1",
            Message = "Need pruning in March"
        });

        Assert.NotNull(stored);
        Assert.Equal("Archanes", stored!.ApproximateArea);
        Assert.Equal(1.5, stored.AreaHectares);
        Assert.Equal("field-1", stored.FieldId);
        Assert.DoesNotContain("25.155", stored.ApproximateArea);
        Assert.Equal("Archanes", dto.ApproximateArea);
        _notifications.Verify(n => n.NotifyAsync(It.Is<UserNotification>(x => x.UserId == "pruner-1"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPublicProfileAsync_HidesPhoneUnlessShowPhone()
    {
        var profile = ListedProfile("pruner-1");
        profile.ShowPhone = false;
        profile.PhoneNumber = "+306900000000";
        _profiles.Setup(r => r.GetByUserIdAsync("pruner-1", It.IsAny<CancellationToken>())).ReturnsAsync(profile);
        _categories.Setup(r => r.GetByIdAsync("cat-pruning", It.IsAny<CancellationToken>())).ReturnsAsync(Pruning);

        var dto = await _service.GetPublicProfileAsync("pruner-1");

        Assert.Null(dto.PhoneNumber);
        Assert.False(dto.IsVerified);
        Assert.Null(dto.GetType().GetProperty("BaseLocation"));
    }

    [Fact]
    public async Task UpdateRequestStatusAsync_AcceptLinksTaskWithoutAssignedUserId()
    {
        var request = new ServiceContactRequest
        {
            Id = "req-1",
            RequesterUserId = "owner-1",
            ProviderUserId = "pruner-1",
            ServiceCategoryId = "cat-pruning",
            TaskId = "task-1",
            Status = ServiceContactStatus.New,
            ApproximateArea = "Peza"
        };
        var task = new Core.Entities.FieldWork.FieldTask
        {
            Id = "task-1",
            FieldId = "field-1",
            Title = "Pruning",
            AssignedUserId = null
        };
        _requests.Setup(r => r.GetByIdAsync("req-1", It.IsAny<CancellationToken>())).ReturnsAsync(request);
        _requests.Setup(r => r.UpdateAsync(It.IsAny<ServiceContactRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ServiceContactRequest r, CancellationToken _) => r);
        _fieldTasks.Setup(r => r.GetByIdAsync("task-1", It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _fieldTasks.Setup(r => r.UpdateAsync(It.IsAny<Core.Entities.FieldWork.FieldTask>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Core.Entities.FieldWork.FieldTask t, CancellationToken _) => t);
        _categories.Setup(r => r.GetByIdAsync("cat-pruning", It.IsAny<CancellationToken>())).ReturnsAsync(Pruning);
        _users.Setup(r => r.GetByIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "owner-1", FirstName = "Giorgos" });
        _profiles.Setup(r => r.GetByUserIdAsync("pruner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(ListedProfile("pruner-1"));

        await _service.UpdateRequestStatusAsync("req-1", "pruner-1", new UpdateServiceContactStatusDto
        {
            Status = "Accepted",
            LinkTask = true
        });

        Assert.Null(task.AssignedUserId);
        Assert.Equal("pruner-1", task.AssignedCollaboratorId);
    }

    [Theory]
    [InlineData(null, 50)]
    [InlineData(20, 25)]
    [InlineData(40, 50)]
    [InlineData(60, 60)]
    [InlineData(90, 100)]
    public void NormalizeRadius_SnapsToDefaults(int? input, int expected)
    {
        Assert.Equal(expected, PartnerService.NormalizeRadius(input));
    }

    [Fact]
    public void Rank_PrefersMatchingAvailableVerifiedCloserProfiles()
    {
        var available = new NearbyProviderMatch(ListedProfile("a"), 5);
        available.Profile.Availability = ProviderAvailability.Available;
        available.Profile.VerificationStatus = VerificationStatus.ProfessionalVerified;
        available.Profile.CompletenessScore = 90;

        var farUnavailable = new NearbyProviderMatch(ListedProfile("b"), 40);
        farUnavailable.Profile.Availability = ProviderAvailability.Unavailable;
        farUnavailable.Profile.VerificationStatus = VerificationStatus.Unverified;
        farUnavailable.Profile.CompletenessScore = 20;

        Assert.True(PartnerService.Rank(available, new HashSet<string> { "cat-pruning" }) > PartnerService.Rank(farUnavailable, new HashSet<string> { "cat-pruning" }));
    }

    [Fact]
    public void MatchingCategoryIds_IncludesParentAndChildren()
    {
        var child = new ServiceCategory { Id = "child", ParentCategoryId = "cat-pruning", Slug = "pruning-production" };
        var ids = PartnerService.MatchingCategoryIds(Pruning, [Pruning, child]);
        Assert.Contains("cat-pruning", ids);
        Assert.Contains("child", ids);
    }

    [Fact]
    public void NextRadius_ExpandsToSixtyThenHundred()
    {
        Assert.Equal(50, PartnerService.NextRadius(25));
        Assert.Equal(60, PartnerService.NextRadius(50));
        Assert.Equal(100, PartnerService.NextRadius(60));
        Assert.Equal(100, PartnerService.NextRadius(100));
    }

    [Fact]
    public void RecalculateListingState_RequiresCoreFields()
    {
        var profile = new ServiceProviderProfile { DisplayName = "Nikos", IsPaused = false };
        profile.RecalculateListingState();
        Assert.False(profile.IsListed);

        profile.ServiceCategoryIds = ["cat-pruning"];
        profile.ShortDescription = "Pruning";
        profile.ServiceRadiusKm = 50;
        profile.BaseLocation = new GeoJsonPoint { Coordinates = [25.1, 35.3] };
        profile.RecalculateListingState();
        Assert.True(profile.IsListed);
    }

    private static ServiceProviderProfile ListedProfile(string userId)
    {
        var profile = new ServiceProviderProfile
        {
            Id = $"profile-{userId}",
            UserId = userId,
            DisplayName = userId,
            ServiceCategoryIds = ["cat-pruning"],
            ShortDescription = "Olive work",
            ServiceRadiusKm = 50,
            BaseLocation = new GeoJsonPoint { Coordinates = [25.14, 35.33] },
            BaseAreaLabel = "Heraklion",
            Availability = ProviderAvailability.Available,
            IsPaused = false
        };
        profile.RecalculateListingState();
        return profile;
    }
}
