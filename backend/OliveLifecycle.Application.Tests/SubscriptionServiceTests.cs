using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration;
using OliveLifecycle.Application.Services;
using Microsoft.Extensions.Options;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class SubscriptionServiceTests
{
    private readonly Mock<IBillingProfileRepository> _profiles = new();
    private readonly Mock<IProcessedBillingEventRepository> _events = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly SubscriptionOptions _options = new()
    {
        FreeOwnedFieldLimit = 1,
        ProOwnedFieldLimit = 5,
        ProEntitlementId = "pro",
        FieldCreationLockSeconds = 15
    };

    public SubscriptionServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 10, 7, 12, 0, 0, DateTimeKind.Utc));
        _profiles.Setup(p => p.TryAcquireFieldCreationLockAsync(It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _profiles.Setup(p => p.ReleaseFieldCreationLockAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _profiles.Setup(p => p.UpsertAsync(It.IsAny<BillingProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((BillingProfile profile, CancellationToken _) => profile);
    }

    [Fact]
    public async Task FreeUser_ZeroOwned_CanCreateFirst()
    {
        SetupProfile("user-1", entitlementActive: false);
        _fields.Setup(f => f.GetByOwnerIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());

        var service = CreateService();
        Assert.True(await service.CanCreateOwnedFieldAsync("user-1"));
        await service.AssertCanCreateOwnedFieldAsync("user-1");
    }

    [Fact]
    public async Task FreeUser_OneOwned_CannotCreateSecond()
    {
        SetupProfile("user-1", entitlementActive: false);
        _fields.Setup(f => f.GetByOwnerIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Owned("f1", "user-1") });

        var service = CreateService();
        Assert.False(await service.CanCreateOwnedFieldAsync("user-1"));
        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.AssertCanCreateOwnedFieldAsync("user-1"));
        Assert.Equal(SubscriptionService.FieldLimitErrorCode, ex.Code);
    }

    [Fact]
    public async Task ProUser_BelowLimit_CanCreate()
    {
        SetupProfile("user-1", entitlementActive: true);
        _fields.Setup(f => f.GetByOwnerIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Owned("f1", "user-1"), Owned("f2", "user-1") });

        var service = CreateService();
        Assert.True(await service.CanCreateOwnedFieldAsync("user-1"));
        var snapshot = await service.GetSubscriptionSnapshotAsync("user-1");
        Assert.Equal("pro", snapshot.Plan);
        Assert.Equal(5, snapshot.Limits.OwnedFields);
        Assert.Equal(2, snapshot.Usage.OwnedFields);
        Assert.True(snapshot.CanCreateField);
    }

    [Fact]
    public async Task ProUser_AtLimit_Denied()
    {
        SetupProfile("user-1", entitlementActive: true);
        _fields.Setup(f => f.GetByOwnerIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Enumerable.Range(1, 5).Select(i => Owned($"f{i}", "user-1")));

        var service = CreateService();
        Assert.False(await service.CanCreateOwnedFieldAsync("user-1"));
    }

    [Fact]
    public async Task Memberships_DoNotConsumeQuota()
    {
        SetupProfile("user-1", entitlementActive: false);
        _fields.Setup(f => f.GetByOwnerIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Owned("owned-1", "user-1") });

        var service = CreateService();
        // Invited fields are not returned by GetByOwnerIdAsync — quota stays at 1/1.
        Assert.False(await service.CanCreateOwnedFieldAsync("user-1"));
        Assert.Equal(1, await service.CountOwnedFieldsAsync("user-1"));
    }

    [Fact]
    public async Task Transfer_ToFreeUserAtLimit_Denied()
    {
        SetupProfile("free-2", entitlementActive: false);
        _fields.Setup(f => f.GetByOwnerIdAsync("free-2", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Owned("their-field", "free-2") });

        var service = CreateService();
        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            service.AssertCanTransferOwnershipAsync("free-2"));
        Assert.Equal(SubscriptionService.FieldLimitErrorCode, ex.Code);
    }

    [Fact]
    public async Task Expiration_PreservesData_AndRequiresWritableSelection()
    {
        var profile = SetupProfile("user-1", entitlementActive: true, persistMutable: true);
        _fields.Setup(f => f.GetByOwnerIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                Owned("f1", "user-1", "Grove A"),
                Owned("f2", "user-1", "Grove B"),
                Owned("f3", "user-1", "Grove C")
            });

        var service = CreateService();
        await service.ApplyRevenueCatEventAsync(new RevenueCatWebhookEventDto
        {
            EventId = "evt-exp-1",
            Type = "EXPIRATION",
            AppUserId = "user-1",
            EntitlementActive = false,
            EventTimestamp = _clock.Object.UtcNow
        });

        Assert.False(profile.EntitlementActive);
        Assert.Equal(PlanCode.Free, profile.PlanCode);
        Assert.True(profile.NeedsWritableFieldSelection);
        Assert.False(await service.IsOwnedFieldWritableAsync("user-1", "f1"));
        Assert.False(await service.IsOwnedFieldWritableAsync("user-1", "f2"));

        await service.SelectWritableFieldAsync("user-1", "f2");
        Assert.True(await service.IsOwnedFieldWritableAsync("user-1", "f2"));
        Assert.False(await service.IsOwnedFieldWritableAsync("user-1", "f1"));
        Assert.False(profile.NeedsWritableFieldSelection);
    }

    [Fact]
    public async Task Reactivation_RemovesReadOnlyRestriction()
    {
        var profile = SetupProfile("user-1", entitlementActive: false, persistMutable: true);
        profile.NeedsWritableFieldSelection = false;
        profile.SelectedWritableFieldId = "f1";
        _fields.Setup(f => f.GetByOwnerIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Owned("f1", "user-1"), Owned("f2", "user-1") });

        var service = CreateService();
        await service.ApplyRevenueCatEventAsync(new RevenueCatWebhookEventDto
        {
            EventId = "evt-renew-1",
            Type = "RENEWAL",
            AppUserId = "user-1",
            ProductId = "theolivelot_pro_yearly",
            Store = "PLAY_STORE",
            EntitlementActive = true,
            WillRenew = true,
            ExpirationAt = _clock.Object.UtcNow.AddYears(1),
            EventTimestamp = _clock.Object.UtcNow
        });

        Assert.True(profile.EntitlementActive);
        Assert.Equal(PlanCode.Pro, profile.PlanCode);
        Assert.True(await service.IsOwnedFieldWritableAsync("user-1", "f1"));
        Assert.True(await service.IsOwnedFieldWritableAsync("user-1", "f2"));
        Assert.Equal(BillingProvider.GooglePlay, profile.Provider);
    }

    [Fact]
    public async Task Webhook_DuplicateEvent_IsIdempotent()
    {
        SetupProfile("user-1", entitlementActive: false, persistMutable: true);
        _fields.Setup(f => f.GetByOwnerIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());
        _events.SetupSequence(e => e.ExistsAsync("evt-dup", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false)
            .ReturnsAsync(true);
        _events.Setup(e => e.CreateAsync(It.IsAny<ProcessedBillingEvent>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ProcessedBillingEvent e, CancellationToken _) => e);

        var service = CreateService();
        var dto = new RevenueCatWebhookEventDto
        {
            EventId = "evt-dup",
            Type = "INITIAL_PURCHASE",
            AppUserId = "user-1",
            EntitlementActive = true,
            Store = "STRIPE",
            ProductId = "theolivelot_pro_monthly"
        };

        await service.ApplyRevenueCatEventAsync(dto);
        await service.ApplyRevenueCatEventAsync(dto);

        _events.Verify(e => e.CreateAsync(It.IsAny<ProcessedBillingEvent>(), It.IsAny<CancellationToken>()), Times.Once);
        _profiles.Verify(p => p.UpsertAsync(It.IsAny<BillingProfile>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task OnOwnedFieldDeleted_PromotesRemainingFreeField()
    {
        var profile = SetupProfile("user-1", entitlementActive: false, persistMutable: true);
        profile.SelectedWritableFieldId = "f1";
        profile.NeedsWritableFieldSelection = false;

        _fields.SetupSequence(f => f.GetByOwnerIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Owned("f2", "user-1") });

        var service = CreateService();
        await service.OnOwnedFieldDeletedAsync("user-1", "f1");

        Assert.Equal("f2", profile.SelectedWritableFieldId);
        Assert.False(profile.NeedsWritableFieldSelection);
    }

    private SubscriptionService CreateService() =>
        new(
            _profiles.Object,
            _events.Object,
            _fields.Object,
            _clock.Object,
            Options.Create(_options),
            NullLogger<SubscriptionService>.Instance);

    private BillingProfile SetupProfile(string userId, bool entitlementActive, bool persistMutable = false)
    {
        var profile = new BillingProfile
        {
            Id = "bp-" + userId,
            UserId = userId,
            PlanCode = entitlementActive ? PlanCode.Pro : PlanCode.Free,
            Status = entitlementActive ? SubscriptionStatus.Active : SubscriptionStatus.Active,
            EntitlementActive = entitlementActive,
            WillRenew = entitlementActive,
            Provider = entitlementActive ? BillingProvider.GooglePlay : BillingProvider.None
        };

        _profiles.Setup(p => p.GetByUserIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync(profile);
        if (persistMutable)
        {
            _profiles.Setup(p => p.UpsertAsync(It.IsAny<BillingProfile>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((BillingProfile p, CancellationToken _) =>
                {
                    profile.EntitlementActive = p.EntitlementActive;
                    profile.PlanCode = p.PlanCode;
                    profile.Status = p.Status;
                    profile.Provider = p.Provider;
                    profile.ProductId = p.ProductId;
                    profile.WillRenew = p.WillRenew;
                    profile.CurrentPeriodEndsAt = p.CurrentPeriodEndsAt;
                    profile.NeedsWritableFieldSelection = p.NeedsWritableFieldSelection;
                    profile.SelectedWritableFieldId = p.SelectedWritableFieldId;
                    profile.SelectedWritableFieldIdChangedAt = p.SelectedWritableFieldIdChangedAt;
                    return profile;
                });
        }

        _events.Setup(e => e.ExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _events.Setup(e => e.CreateAsync(It.IsAny<ProcessedBillingEvent>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ProcessedBillingEvent e, CancellationToken _) => e);

        return profile;
    }

    private static Field Owned(string id, string ownerId, string? name = null)
    {
        var field = new Field
        {
            Id = id,
            OwnerId = ownerId,
            Name = name ?? id
        };
        FieldPeopleRules.AddOrReplaceSeat(
            field,
            FieldPersonRole.Admin,
            ownerId,
            FamilyModules.All,
            FamilyAccessLevels.Work,
            ownerId,
            status: FamilyMemberStatuses.Active);
        return field;
    }
}
