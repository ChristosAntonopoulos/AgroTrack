using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Subscription;
using OliveLifecycle.Application.Configuration;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.Subscription;

namespace OliveLifecycle.Application.Services;

public class SubscriptionService : ISubscriptionService
{
    public const string FieldLimitErrorCode = "SUBSCRIPTION_FIELD_LIMIT_REACHED";
    public const string NeedsSelectionErrorCode = "SUBSCRIPTION_WRITABLE_FIELD_SELECTION_REQUIRED";

    private readonly IBillingProfileRepository _billingProfiles;
    private readonly IProcessedBillingEventRepository _processedEvents;
    private readonly IFieldRepository _fields;
    private readonly IDateTimeProvider _clock;
    private readonly SubscriptionOptions _options;
    private readonly ILogger<SubscriptionService> _logger;

    public SubscriptionService(
        IBillingProfileRepository billingProfiles,
        IProcessedBillingEventRepository processedEvents,
        IFieldRepository fields,
        IDateTimeProvider clock,
        IOptions<SubscriptionOptions> options,
        ILogger<SubscriptionService> logger)
    {
        _billingProfiles = billingProfiles;
        _processedEvents = processedEvents;
        _fields = fields;
        _clock = clock;
        _options = options.Value;
        _logger = logger;
    }

    public SubscriptionPlanDefinition GetPlanDefinition(PlanCode planCode) =>
        planCode == PlanCode.Pro
            ? SubscriptionPlanDefinition.Pro(_options.ProOwnedFieldLimit, _options.ProEntitlementId)
            : SubscriptionPlanDefinition.Free(_options.FreeOwnedFieldLimit);

    public async Task<PlanCode> GetPlanForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        var profile = await GetOrCreateBillingProfileAsync(userId, cancellationToken);
        return ResolveEffectivePlan(profile);
    }

    public async Task<int> GetOwnedFieldLimitAsync(string userId, CancellationToken cancellationToken = default)
    {
        var plan = await GetPlanForUserAsync(userId, cancellationToken);
        return GetPlanDefinition(plan).OwnedFieldLimit;
    }

    public async Task<int> CountOwnedFieldsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var owned = await _fields.GetByOwnerIdAsync(userId, cancellationToken);
        return owned.Count();
    }

    public async Task<bool> CanCreateOwnedFieldAsync(string userId, CancellationToken cancellationToken = default)
    {
        var owned = await CountOwnedFieldsAsync(userId, cancellationToken);
        var limit = await GetOwnedFieldLimitAsync(userId, cancellationToken);
        return owned < limit;
    }

    public async Task AssertCanCreateOwnedFieldAsync(string userId, CancellationToken cancellationToken = default)
    {
        var now = _clock.UtcNow;
        var lockUntil = now.AddSeconds(Math.Max(1, _options.FieldCreationLockSeconds));
        var acquired = await _billingProfiles.TryAcquireFieldCreationLockAsync(userId, lockUntil, cancellationToken);
        if (!acquired)
        {
            throw new ConflictException(
                "Another grove is being created. Please wait a moment and try again.",
                FieldLimitErrorCode);
        }

        try
        {
            if (!await CanCreateOwnedFieldAsync(userId, cancellationToken))
            {
                var limit = await GetOwnedFieldLimitAsync(userId, cancellationToken);
                throw new ConflictException(
                    $"Your plan allows up to {limit} owned grove(s). Upgrade to Pro to add more.",
                    FieldLimitErrorCode);
            }
        }
        catch
        {
            await _billingProfiles.ReleaseFieldCreationLockAsync(userId, cancellationToken);
            throw;
        }
    }

    public Task ReleaseFieldCreationLockAsync(string userId, CancellationToken cancellationToken = default) =>
        _billingProfiles.ReleaseFieldCreationLockAsync(userId, cancellationToken);

    public async Task AssertCanTransferOwnershipAsync(string newOwnerUserId, CancellationToken cancellationToken = default)
    {
        if (!await CanCreateOwnedFieldAsync(newOwnerUserId, cancellationToken))
        {
            var limit = await GetOwnedFieldLimitAsync(newOwnerUserId, cancellationToken);
            throw new ConflictException(
                $"The new owner has reached their plan limit of {limit} owned grove(s).",
                FieldLimitErrorCode);
        }
    }

    public async Task<SubscriptionSnapshotDto> GetSubscriptionSnapshotAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var profile = await GetOrCreateBillingProfileAsync(userId, cancellationToken);
        await EnsureDowngradeStateAsync(profile, cancellationToken);
        profile = await GetOrCreateBillingProfileAsync(userId, cancellationToken);

        var plan = ResolveEffectivePlan(profile);
        var definition = GetPlanDefinition(plan);
        var ownedCount = await CountOwnedFieldsAsync(userId, cancellationToken);
        var canCreate = ownedCount < definition.OwnedFieldLimit;

        var renewsAt = profile.WillRenew && profile.EntitlementActive
            ? profile.CurrentPeriodEndsAt
            : null;
        var expiresAt = !profile.WillRenew && profile.EntitlementActive
            ? profile.CurrentPeriodEndsAt
            : profile.EntitlementActive
                ? null
                : profile.CurrentPeriodEndsAt;

        return new SubscriptionSnapshotDto
        {
            Plan = ToApiPlan(plan),
            Status = ToApiStatus(profile),
            EntitlementActive = profile.EntitlementActive,
            Limits = new SubscriptionLimitsDto { OwnedFields = definition.OwnedFieldLimit },
            Usage = new SubscriptionUsageDto { OwnedFields = ownedCount },
            Provider = ToApiProvider(profile.Provider),
            ProductId = profile.ProductId,
            RenewsAt = renewsAt,
            ExpiresAt = expiresAt,
            WillRenew = profile.WillRenew,
            CanCreateField = canCreate,
            NeedsWritableFieldSelection = profile.NeedsWritableFieldSelection,
            SelectedWritableFieldId = profile.SelectedWritableFieldId,
            HasBillingIssue = profile.Status is SubscriptionStatus.BillingIssue or SubscriptionStatus.GracePeriod
        };
    }

    public async Task<BillingProfile> GetOrCreateBillingProfileAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var existing = await _billingProfiles.GetByUserIdAsync(userId, cancellationToken);
        if (existing != null)
        {
            return existing;
        }

        var created = new BillingProfile
        {
            UserId = userId,
            PlanCode = PlanCode.Free,
            Status = SubscriptionStatus.Active,
            Provider = BillingProvider.None,
            EntitlementActive = false,
            WillRenew = false,
            CreatedAt = _clock.UtcNow,
            UpdatedAt = _clock.UtcNow
        };
        return await _billingProfiles.UpsertAsync(created, cancellationToken);
    }

    public async Task<bool> IsOwnedFieldWritableAsync(
        string ownerUserId,
        string fieldId,
        CancellationToken cancellationToken = default)
    {
        var profile = await GetOrCreateBillingProfileAsync(ownerUserId, cancellationToken);
        await EnsureDowngradeStateAsync(profile, cancellationToken);
        profile = await GetOrCreateBillingProfileAsync(ownerUserId, cancellationToken);

        if (profile.EntitlementActive)
        {
            return true;
        }

        var owned = (await _fields.GetByOwnerIdAsync(ownerUserId, cancellationToken)).ToList();
        var freeLimit = _options.FreeOwnedFieldLimit;
        if (owned.Count <= freeLimit)
        {
            return owned.Any(f => string.Equals(f.Id, fieldId, StringComparison.Ordinal));
        }

        if (profile.NeedsWritableFieldSelection || string.IsNullOrWhiteSpace(profile.SelectedWritableFieldId))
        {
            return false;
        }

        return string.Equals(profile.SelectedWritableFieldId, fieldId, StringComparison.Ordinal);
    }

    public async Task SelectWritableFieldAsync(
        string userId,
        string fieldId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fieldId))
        {
            throw new ValidationException("Field id is required.");
        }

        var profile = await GetOrCreateBillingProfileAsync(userId, cancellationToken);
        if (profile.EntitlementActive)
        {
            throw new ValidationException("Writable grove selection is only needed on the free plan.");
        }

        if (!profile.NeedsWritableFieldSelection &&
            !string.IsNullOrWhiteSpace(profile.SelectedWritableFieldId) &&
            !string.Equals(profile.SelectedWritableFieldId, fieldId, StringComparison.Ordinal))
        {
            throw new ConflictException(
                "You already chose your free writable grove. Upgrade to Pro to manage more groves.",
                "SUBSCRIPTION_WRITABLE_FIELD_LOCKED");
        }

        var owned = (await _fields.GetByOwnerIdAsync(userId, cancellationToken)).ToList();
        if (!owned.Any(f => string.Equals(f.Id, fieldId, StringComparison.Ordinal)))
        {
            throw new ValidationException("You can only select a grove you own.");
        }

        profile.SelectedWritableFieldId = fieldId;
        profile.SelectedWritableFieldIdChangedAt = _clock.UtcNow;
        profile.NeedsWritableFieldSelection = false;
        profile.UpdatedAt = _clock.UtcNow;
        await _billingProfiles.UpsertAsync(profile, cancellationToken);
    }

    public async Task<IReadOnlyList<OwnedFieldSummaryDto>> GetOwnedFieldSummariesAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var owned = (await _fields.GetByOwnerIdAsync(userId, cancellationToken))
            .OrderBy(f => f.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var result = new List<OwnedFieldSummaryDto>(owned.Count);
        foreach (var field in owned)
        {
            result.Add(new OwnedFieldSummaryDto
            {
                Id = field.Id,
                Name = field.Name,
                IsWritable = await IsOwnedFieldWritableAsync(userId, field.Id, cancellationToken)
            });
        }

        return result;
    }

    public async Task OnOwnedFieldDeletedAsync(
        string userId,
        string deletedFieldId,
        CancellationToken cancellationToken = default)
    {
        var profile = await GetOrCreateBillingProfileAsync(userId, cancellationToken);
        var owned = (await _fields.GetByOwnerIdAsync(userId, cancellationToken)).ToList();

        if (string.Equals(profile.SelectedWritableFieldId, deletedFieldId, StringComparison.Ordinal))
        {
            profile.SelectedWritableFieldId = null;
            profile.SelectedWritableFieldIdChangedAt = _clock.UtcNow;
        }

        if (!profile.EntitlementActive && owned.Count > 0)
        {
            if (owned.Count <= _options.FreeOwnedFieldLimit)
            {
                profile.SelectedWritableFieldId = owned[0].Id;
                profile.NeedsWritableFieldSelection = false;
            }
            else if (string.IsNullOrWhiteSpace(profile.SelectedWritableFieldId) ||
                     !owned.Any(f => string.Equals(f.Id, profile.SelectedWritableFieldId, StringComparison.Ordinal)))
            {
                profile.NeedsWritableFieldSelection = true;
                profile.SelectedWritableFieldId = null;
            }
        }
        else if (owned.Count == 0)
        {
            profile.SelectedWritableFieldId = null;
            profile.NeedsWritableFieldSelection = false;
        }

        profile.UpdatedAt = _clock.UtcNow;
        await _billingProfiles.UpsertAsync(profile, cancellationToken);
        await _billingProfiles.ReleaseFieldCreationLockAsync(userId, cancellationToken);
    }

    public async Task ApplyRevenueCatEventAsync(
        RevenueCatWebhookEventDto webhookEvent,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(webhookEvent.EventId))
        {
            throw new ValidationException("RevenueCat event id is required.");
        }

        if (await _processedEvents.ExistsAsync(webhookEvent.EventId, cancellationToken))
        {
            _logger.LogInformation(
                "Skipping duplicate RevenueCat event {EventId} type {Type}",
                webhookEvent.EventId,
                webhookEvent.Type);
            return;
        }

        if (string.IsNullOrWhiteSpace(webhookEvent.AppUserId))
        {
            throw new ValidationException("RevenueCat app_user_id is required.");
        }

        var profile = await GetOrCreateBillingProfileAsync(webhookEvent.AppUserId, cancellationToken);
        MapEventToProfile(profile, webhookEvent);
        profile.LastRevenueCatEventAt = webhookEvent.EventTimestamp == default
            ? _clock.UtcNow
            : webhookEvent.EventTimestamp;
        profile.UpdatedAt = _clock.UtcNow;

        await EnsureDowngradeStateAsync(profile, cancellationToken, persist: false);
        await _billingProfiles.UpsertAsync(profile, cancellationToken);

        await _processedEvents.CreateAsync(new ProcessedBillingEvent
        {
            ProviderEventId = webhookEvent.EventId,
            Provider = "revenuecat",
            EventType = webhookEvent.Type,
            AppUserId = webhookEvent.AppUserId,
            ProcessedAt = _clock.UtcNow,
            CreatedAt = _clock.UtcNow,
            UpdatedAt = _clock.UtcNow
        }, cancellationToken);

        _logger.LogInformation(
            "Applied RevenueCat event {EventId} type {Type} for user {UserId} entitlementActive={Active} status={Status}",
            webhookEvent.EventId,
            webhookEvent.Type,
            webhookEvent.AppUserId,
            profile.EntitlementActive,
            profile.Status);
    }

    public async Task<SubscriptionSnapshotDto> RefreshFromClientHintAsync(
        string userId,
        ClientSubscriptionHintDto? hint,
        CancellationToken cancellationToken = default)
    {
        if (hint?.EntitlementActive == true)
        {
            var profile = await GetOrCreateBillingProfileAsync(userId, cancellationToken);
            if (!profile.EntitlementActive)
            {
                // Optimistic bridge until webhook arrives — still requires RC CustomerInfo success on client.
                profile.EntitlementActive = true;
                profile.PlanCode = PlanCode.Pro;
                profile.Status = SubscriptionStatus.Active;
                profile.ProductId = hint.ProductId ?? profile.ProductId;
                profile.Provider = MapStore(hint.Store) != BillingProvider.None
                    ? MapStore(hint.Store)
                    : profile.Provider;
                profile.CurrentPeriodEndsAt = hint.ExpirationAt ?? profile.CurrentPeriodEndsAt;
                profile.WillRenew = hint.WillRenew ?? profile.WillRenew;
                profile.NeedsWritableFieldSelection = false;
                profile.UpdatedAt = _clock.UtcNow;
                await _billingProfiles.UpsertAsync(profile, cancellationToken);
            }
        }

        return await GetSubscriptionSnapshotAsync(userId, cancellationToken);
    }

    private void MapEventToProfile(BillingProfile profile, RevenueCatWebhookEventDto evt)
    {
        var type = (evt.Type ?? string.Empty).Trim().ToUpperInvariant();
        profile.ProductId = evt.ProductId ?? profile.ProductId;
        if (!string.IsNullOrWhiteSpace(evt.Store))
        {
            profile.Provider = MapStore(evt.Store);
        }

        if (evt.ExpirationAt.HasValue)
        {
            profile.CurrentPeriodEndsAt = evt.ExpirationAt;
        }

        if (evt.WillRenew.HasValue)
        {
            profile.WillRenew = evt.WillRenew.Value;
        }

        switch (type)
        {
            case "INITIAL_PURCHASE":
            case "RENEWAL":
            case "UNCANCELLATION":
            case "PRODUCT_CHANGE":
            case "NON_RENEWING_PURCHASE":
            case "SUBSCRIPTION_EXTENDED":
            case "TEMPORARY_ENTITLEMENT_GRANT":
                profile.EntitlementActive = true;
                profile.PlanCode = PlanCode.Pro;
                profile.Status = SubscriptionStatus.Active;
                profile.NeedsWritableFieldSelection = false;
                if (!evt.WillRenew.HasValue)
                {
                    profile.WillRenew = true;
                }
                break;

            case "CANCELLATION":
                profile.EntitlementActive = true;
                profile.PlanCode = PlanCode.Pro;
                profile.Status = SubscriptionStatus.CancelAtPeriodEnd;
                profile.WillRenew = false;
                break;

            case "BILLING_ISSUE":
                profile.EntitlementActive = evt.EntitlementActive || profile.EntitlementActive;
                profile.PlanCode = profile.EntitlementActive ? PlanCode.Pro : PlanCode.Free;
                profile.Status = profile.EntitlementActive
                    ? SubscriptionStatus.GracePeriod
                    : SubscriptionStatus.BillingIssue;
                break;

            case "EXPIRATION":
            case "SUBSCRIPTION_PAUSED":
                profile.EntitlementActive = false;
                profile.PlanCode = PlanCode.Free;
                profile.Status = SubscriptionStatus.Expired;
                profile.WillRenew = false;
                break;

            default:
                profile.EntitlementActive = evt.EntitlementActive;
                if (evt.EntitlementActive)
                {
                    profile.PlanCode = PlanCode.Pro;
                    profile.Status = SubscriptionStatus.Active;
                }
                break;
        }

        // Prefer explicit entitlement flag from mapped payload when provided for billing issue / generic.
        if (type is "BILLING_ISSUE" or "")
        {
            // already handled
        }
        else if (evt.EntitlementActive && type is not ("EXPIRATION" or "SUBSCRIPTION_PAUSED"))
        {
            profile.EntitlementActive = true;
        }
    }

    private async Task EnsureDowngradeStateAsync(
        BillingProfile profile,
        CancellationToken cancellationToken,
        bool persist = true)
    {
        if (profile.EntitlementActive)
        {
            if (profile.NeedsWritableFieldSelection || profile.PlanCode != PlanCode.Pro)
            {
                profile.NeedsWritableFieldSelection = false;
                profile.PlanCode = PlanCode.Pro;
                if (persist)
                {
                    profile.UpdatedAt = _clock.UtcNow;
                    await _billingProfiles.UpsertAsync(profile, cancellationToken);
                }
            }

            return;
        }

        profile.PlanCode = PlanCode.Free;
        var owned = (await _fields.GetByOwnerIdAsync(profile.UserId, cancellationToken)).ToList();
        var freeLimit = _options.FreeOwnedFieldLimit;

        if (owned.Count <= freeLimit)
        {
            profile.NeedsWritableFieldSelection = false;
            if (owned.Count == 1)
            {
                profile.SelectedWritableFieldId = owned[0].Id;
            }
            else if (owned.Count == 0)
            {
                profile.SelectedWritableFieldId = null;
            }
        }
        else
        {
            var selectedStillOwned = !string.IsNullOrWhiteSpace(profile.SelectedWritableFieldId) &&
                owned.Any(f => string.Equals(f.Id, profile.SelectedWritableFieldId, StringComparison.Ordinal));

            if (!selectedStillOwned)
            {
                profile.SelectedWritableFieldId = null;
                profile.NeedsWritableFieldSelection = true;
            }
        }

        if (persist)
        {
            profile.UpdatedAt = _clock.UtcNow;
            await _billingProfiles.UpsertAsync(profile, cancellationToken);
        }
    }

    private static PlanCode ResolveEffectivePlan(BillingProfile profile) =>
        profile.EntitlementActive ? PlanCode.Pro : PlanCode.Free;

    private static string ToApiPlan(PlanCode plan) =>
        plan == PlanCode.Pro ? "pro" : "free";

    private static string ToApiStatus(BillingProfile profile) =>
        profile.Status switch
        {
            SubscriptionStatus.GracePeriod => "grace_period",
            SubscriptionStatus.BillingIssue => "billing_issue",
            SubscriptionStatus.CancelAtPeriodEnd => "cancel_at_period_end",
            SubscriptionStatus.Expired => "expired",
            _ => "active"
        };

    private static string? ToApiProvider(BillingProvider provider) =>
        provider switch
        {
            BillingProvider.GooglePlay => "google_play",
            BillingProvider.AppStore => "app_store",
            BillingProvider.Web => "web",
            _ => null
        };

    private static BillingProvider MapStore(string? store)
    {
        if (string.IsNullOrWhiteSpace(store))
        {
            return BillingProvider.None;
        }

        var normalized = store.Trim().ToUpperInvariant();
        if (normalized.Contains("PLAY", StringComparison.Ordinal) ||
            normalized.Contains("GOOGLE", StringComparison.Ordinal) ||
            normalized is "PLAY_STORE" or "GOOGLE_PLAY_STORE" or "GOOGLE_PLAY_STORE_V2")
        {
            return BillingProvider.GooglePlay;
        }

        if (normalized.Contains("APP_STORE", StringComparison.Ordinal) ||
            normalized.Contains("APPLE", StringComparison.Ordinal) ||
            normalized is "APP_STORE" or "MAC_APP_STORE")
        {
            return BillingProvider.AppStore;
        }

        if (normalized.Contains("STRIPE", StringComparison.Ordinal) ||
            normalized.Contains("WEB", StringComparison.Ordinal) ||
            normalized.Contains("RC_BILLING", StringComparison.Ordinal) ||
            normalized.Contains("PADDLE", StringComparison.Ordinal))
        {
            return BillingProvider.Web;
        }

        return BillingProvider.None;
    }
}
