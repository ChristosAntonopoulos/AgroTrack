using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Partners;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.Units;
using OliveLifecycle.Core.ValueObjects;

namespace OliveLifecycle.Application.Services;

public class PartnerService : IPartnerService
{
    public static readonly int[] DefaultRadiiKm = [25, 50, 60, 100];

    private readonly IServiceCategoryRepository _categories;
    private readonly IServiceProviderProfileRepository _profiles;
    private readonly IServiceContactRequestRepository _requests;
    private readonly IUserRepository _users;
    private readonly IFieldRepository _fields;
    private readonly IFieldTaskRepository _fieldTasks;
    private readonly IFieldAccessService _fieldAccess;
    private readonly IUserNotificationService _notifications;
    private readonly IActivityService _activityService;
    private readonly IDateTimeProvider _clock;
    private readonly ILogger<PartnerService> _logger;

    public PartnerService(
        IServiceCategoryRepository categories,
        IServiceProviderProfileRepository profiles,
        IServiceContactRequestRepository requests,
        IUserRepository users,
        IFieldRepository fields,
        IFieldTaskRepository fieldTasks,
        IFieldAccessService fieldAccess,
        IUserNotificationService notifications,
        IActivityService activityService,
        IDateTimeProvider clock,
        ILogger<PartnerService> logger)
    {
        _categories = categories;
        _profiles = profiles;
        _requests = requests;
        _users = users;
        _fields = fields;
        _fieldTasks = fieldTasks;
        _fieldAccess = fieldAccess;
        _notifications = notifications;
        _activityService = activityService;
        _clock = clock;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ServiceCategoryDto>> GetCategoriesAsync(
        bool activeOnly,
        CancellationToken cancellationToken = default)
    {
        var items = await _categories.GetAllAsync(activeOnly, cancellationToken);
        return items.Select(PartnerMapping.ToDto).ToList();
    }

    public async Task<ServiceProviderProfileDto?> GetMyProfileAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var profile = await _profiles.GetByUserIdAsync(userId, cancellationToken);
        return profile == null ? null : await ToOwnerDtoAsync(profile, cancellationToken);
    }

    public async Task<ServiceProviderProfileDto> ActivateAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("User not found.");

        var existing = await _profiles.GetByUserIdAsync(userId, cancellationToken);
        if (existing != null)
        {
            existing.IsPaused = false;
            existing.RecalculateListingState();
            existing.UpdatedAt = _clock.UtcNow;
            var updated = await _profiles.UpdateAsync(existing, cancellationToken);
            return await ToOwnerDtoAsync(updated, cancellationToken);
        }

        var now = _clock.UtcNow;
        var display = string.Join(" ", new[] { user.FirstName, user.LastName }.Where(s => !string.IsNullOrWhiteSpace(s))).Trim();
        var profile = new ServiceProviderProfile
        {
            UserId = userId,
            DisplayName = string.IsNullOrWhiteSpace(display) ? user.Email : display,
            ProviderKind = ProviderKind.Individual,
            ContactPreference = ContactPreference.InApp,
            Availability = ProviderAvailability.Available,
            ServiceRadiusKm = 50,
            PricingNote = "Contact for price",
            CreatedAt = now,
            UpdatedAt = now
        };
        profile.RecalculateListingState();
        var created = await _profiles.CreateAsync(profile, cancellationToken);
        _logger.LogInformation("Service profile activated for user {UserId}", userId);
        return await ToOwnerDtoAsync(created, cancellationToken);
    }

    public async Task<ServiceProviderProfileDto> PauseAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var profile = await RequireProfileAsync(userId, cancellationToken);
        profile.IsPaused = true;
        profile.RecalculateListingState();
        profile.UpdatedAt = _clock.UtcNow;
        var updated = await _profiles.UpdateAsync(profile, cancellationToken);
        return await ToOwnerDtoAsync(updated, cancellationToken);
    }

    public async Task<ServiceProviderProfileDto> UpsertMyProfileAsync(
        string userId,
        UpsertServiceProfileDto dto,
        CancellationToken cancellationToken = default)
    {
        var profile = await _profiles.GetByUserIdAsync(userId, cancellationToken);
        if (profile == null)
        {
            await ActivateAsync(userId, cancellationToken);
            profile = await RequireProfileAsync(userId, cancellationToken);
        }

        if (dto.DisplayName != null) profile.DisplayName = dto.DisplayName.Trim();
        if (dto.PhotoUrl != null) profile.PhotoUrl = NullIfEmpty(dto.PhotoUrl);
        if (dto.BusinessName != null) profile.BusinessName = NullIfEmpty(dto.BusinessName);
        if (dto.ProviderKind != null) profile.ProviderKind = Enum.Parse<ProviderKind>(dto.ProviderKind, true);
        if (dto.ServiceCategoryIds != null)
        {
            await EnsureCategoriesExistAsync(dto.ServiceCategoryIds, cancellationToken);
            profile.ServiceCategoryIds = dto.ServiceCategoryIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        }
        if (dto.Latitude.HasValue && dto.Longitude.HasValue)
        {
            profile.BaseLocation = new GeoJsonPoint
            {
                Type = "Point",
                Coordinates = [dto.Longitude.Value, dto.Latitude.Value]
            };
        }
        if (dto.BaseAreaLabel != null) profile.BaseAreaLabel = NullIfEmpty(dto.BaseAreaLabel);
        if (dto.ServiceRadiusKm.HasValue) profile.ServiceRadiusKm = dto.ServiceRadiusKm.Value;
        if (dto.ServiceAreas != null)
        {
            profile.ServiceAreas = dto.ServiceAreas.Where(a => !string.IsNullOrWhiteSpace(a)).Select(a => a.Trim()).ToList();
        }
        if (dto.ShortDescription != null) profile.ShortDescription = dto.ShortDescription.Trim();
        if (dto.ExperienceYears.HasValue) profile.ExperienceYears = dto.ExperienceYears;
        if (dto.CrewSize.HasValue) profile.CrewSize = dto.CrewSize <= 0 ? null : dto.CrewSize;
        if (dto.Equipment != null) profile.Equipment = NullIfEmpty(dto.Equipment);
        if (dto.MillOperatingPeriod != null) profile.MillOperatingPeriod = NullIfEmpty(dto.MillOperatingPeriod);
        if (dto.MillProcessingMethod != null) profile.MillProcessingMethod = NullIfEmpty(dto.MillProcessingMethod);
        if (dto.MillOrganic.HasValue) profile.MillOrganic = dto.MillOrganic;
        if (dto.MillAppointmentRequired.HasValue) profile.MillAppointmentRequired = dto.MillAppointmentRequired;
        if (dto.Languages != null)
        {
            profile.Languages = dto.Languages.Where(l => !string.IsNullOrWhiteSpace(l)).Select(l => l.Trim()).ToList();
        }
        if (dto.Certifications != null)
        {
            profile.Certifications = dto.Certifications.Where(c => !string.IsNullOrWhiteSpace(c)).Select(c => c.Trim()).ToList();
        }
        if (dto.ContactPreference != null) profile.ContactPreference = Enum.Parse<ContactPreference>(dto.ContactPreference, true);
        if (dto.ShowPhone.HasValue) profile.ShowPhone = dto.ShowPhone.Value;
        if (dto.PhoneNumber != null) profile.PhoneNumber = NullIfEmpty(dto.PhoneNumber);
        if (dto.Availability != null) profile.Availability = Enum.Parse<ProviderAvailability>(dto.Availability, true);
        if (dto.AvailableFrom.HasValue) profile.AvailableFrom = dto.AvailableFrom;
        if (dto.AvailableUntil.HasValue) profile.AvailableUntil = dto.AvailableUntil;
        if (dto.PricingNote != null) profile.PricingNote = NullIfEmpty(dto.PricingNote);

        profile.RecalculateListingState();
        profile.UpdatedAt = _clock.UtcNow;
        var updated = await _profiles.UpdateAsync(profile, cancellationToken);
        return await ToOwnerDtoAsync(updated, cancellationToken);
    }

    public async Task<PartnerSearchResponseDto> SearchAsync(
        string userId,
        string userRole,
        string fieldId,
        string? categoryId,
        string? categorySlug,
        int? radiusKm,
        string? availability,
        string? providerKind,
        bool verifiedOnly,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fieldId))
        {
            throw new ValidationException("A field is required to search nearby partners.");
        }

        if (!await _fieldAccess.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You cannot search partners for this field.");
        }

        var field = await _fields.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (!field.TryGetCoordinates(out var lat, out var lng))
        {
            throw new ValidationException("This field has no location yet. Add a boundary or pin before searching partners.");
        }

        var radius = NormalizeRadius(radiusKm);
        var category = await ResolveCategoryAsync(categoryId, categorySlug, cancellationToken);

        var nearby = await _profiles.FindNearbyListedAsync(lat, lng, radius, cancellationToken);

        ProviderAvailability? availabilityFilter = null;
        if (!string.IsNullOrWhiteSpace(availability) &&
            Enum.TryParse<ProviderAvailability>(availability, true, out var parsedAvailability))
        {
            availabilityFilter = parsedAvailability;
        }

        ProviderKind? kindFilter = null;
        if (!string.IsNullOrWhiteSpace(providerKind) &&
            Enum.TryParse<ProviderKind>(providerKind, true, out var parsedKind))
        {
            kindFilter = parsedKind;
        }

        var allCategories = (await _categories.GetAllAsync(true, cancellationToken) ?? Array.Empty<ServiceCategory>()).ToList();
        var categories = allCategories.ToDictionary(c => c.Id);
        var matchingIds = category == null ? null : MatchingCategoryIds(category, allCategories);

        var results = nearby
            .Where(match => match.Profile.UserId != userId)
            .Where(match => match.DistanceKm <= match.Profile.ServiceRadiusKm)
            .Where(match => matchingIds == null || OffersAny(match.Profile.ServiceCategoryIds, matchingIds))
            .Where(match => availabilityFilter == null || match.Profile.Availability == availabilityFilter)
            .Where(match => kindFilter == null || match.Profile.ProviderKind == kindFilter)
            .Where(match => !verifiedOnly || PartnerMapping.IsVerified(match.Profile.VerificationStatus))
            .OrderByDescending(match => Rank(match, matchingIds))
            .ThenBy(match => match.DistanceKm)
            .Select(match => ToSearchResult(match, categories))
            .ToList();

        var next = NextRadius(radius);
        return new PartnerSearchResponseDto
        {
            Results = results,
            RadiusKm = radius,
            NextRadiusKm = next,
            CanExpandRadius = next > radius,
            FieldApproximateArea = field.GetApproximateAreaLabel()
        };
    }

    public async Task<PartnerPublicProfileDto> GetPublicProfileAsync(
        string providerUserId,
        CancellationToken cancellationToken = default)
    {
        var profile = await _profiles.GetByUserIdAsync(providerUserId, cancellationToken)
            ?? throw new NotFoundException("Partner profile not found.");

        if (profile.IsPaused || !profile.IsListed)
        {
            throw new NotFoundException("Partner profile is not listed.");
        }

        var categories = await LoadCategoriesAsync(profile.ServiceCategoryIds, cancellationToken);
        return new PartnerPublicProfileDto
        {
            UserId = profile.UserId,
            DisplayName = profile.DisplayName,
            PhotoUrl = profile.PhotoUrl,
            BusinessName = profile.BusinessName,
            ProviderKind = profile.ProviderKind.ToString(),
            Categories = categories,
            BaseAreaLabel = profile.BaseAreaLabel,
            ServiceRadiusKm = profile.ServiceRadiusKm,
            ServiceAreas = profile.ServiceAreas,
            ShortDescription = profile.ShortDescription,
            ExperienceYears = profile.ExperienceYears,
            CrewSize = profile.CrewSize,
            Equipment = profile.Equipment,
            MillOperatingPeriod = profile.MillOperatingPeriod,
            MillProcessingMethod = profile.MillProcessingMethod,
            MillOrganic = profile.MillOrganic,
            MillAppointmentRequired = profile.MillAppointmentRequired,
            Languages = profile.Languages,
            Certifications = profile.Certifications,
            ContactPreference = profile.ContactPreference.ToString(),
            PhoneNumber = profile.ShowPhone ? profile.PhoneNumber : null,
            Availability = profile.Availability.ToString(),
            AvailableFrom = profile.AvailableFrom,
            AvailableUntil = profile.AvailableUntil,
            IsVerified = PartnerMapping.IsVerified(profile.VerificationStatus),
            VerificationStatus = profile.VerificationStatus.ToString(),
            PricingNote = profile.PricingNote,
            CompletenessScore = profile.CompletenessScore
        };
    }

    public async Task<ServiceContactRequestDto> ContactAsync(
        string requesterUserId,
        string userRole,
        string providerUserId,
        CreatePartnerContactDto dto,
        CancellationToken cancellationToken = default)
    {
        if (requesterUserId == providerUserId)
        {
            throw new ValidationException("You cannot contact your own listing.");
        }

        var profile = await _profiles.GetByUserIdAsync(providerUserId, cancellationToken)
            ?? throw new NotFoundException("Partner profile not found.");
        if (profile.IsPaused || !profile.IsListed)
        {
            throw new ValidationException("This partner is not currently offering services.");
        }

        var category = await _categories.GetByIdAsync(dto.ServiceCategoryId, cancellationToken)
            ?? throw new ValidationException("Unknown service category.");
        var allCategories = (await _categories.GetAllAsync(true, cancellationToken) ?? Array.Empty<ServiceCategory>()).ToList();
        if (!OffersAny(profile.ServiceCategoryIds, MatchingCategoryIds(category, allCategories)))
        {
            throw new ValidationException("This partner does not offer the selected service.");
        }

        string approximateArea = string.Empty;
        double? areaHectares = null;
        string? fieldId = NullIfEmpty(dto.FieldId);

        if (!string.IsNullOrWhiteSpace(fieldId))
        {
            if (!await _fieldAccess.CanUserAccessFieldAsync(fieldId, requesterUserId, userRole, cancellationToken))
            {
                throw new ForbiddenException("You cannot attach this field to a contact request.");
            }

            var field = await _fields.GetByIdAsync(fieldId, cancellationToken)
                ?? throw new NotFoundException("Field not found.");
            approximateArea = field.GetApproximateAreaLabel();
            var hectares = field.ResolveAreaHectares();
            areaHectares = hectares is > 0 ? Math.Round(hectares.Value, 2) : null;
        }

        string? taskId = NullIfEmpty(dto.TaskId);
        if (!string.IsNullOrWhiteSpace(taskId))
        {
            var task = await _fieldTasks.GetByIdAsync(taskId, cancellationToken)
                ?? throw new NotFoundException("Task not found.");
            if (!string.IsNullOrWhiteSpace(fieldId) && task.FieldId != fieldId)
            {
                throw new ValidationException("Task does not belong to the selected field.");
            }
            if (!await _fieldAccess.CanUserAccessFieldAsync(task.FieldId, requesterUserId, userRole, cancellationToken))
            {
                throw new ForbiddenException("You cannot attach this task to a contact request.");
            }
            fieldId ??= task.FieldId;
        }

        var now = _clock.UtcNow;
        var request = new ServiceContactRequest
        {
            RequesterUserId = requesterUserId,
            ProviderUserId = providerUserId,
            ServiceCategoryId = category.Id,
            FieldId = fieldId,
            TaskId = taskId,
            ApproximateArea = approximateArea,
            AreaHectares = areaHectares,
            SuggestedStart = dto.SuggestedStart,
            SuggestedEnd = dto.SuggestedEnd,
            Message = dto.Message.Trim(),
            Status = ServiceContactStatus.New,
            ContactMethod = "in_app",
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _requests.CreateAsync(request, cancellationToken);

        if (!string.IsNullOrWhiteSpace(created.FieldId))
        {
            await _activityService.RecordAsync(
                created.FieldId,
                "partner_contact_sent",
                $"Contacted partner for {category.NameEn}",
                requesterUserId,
                created.TaskId,
                new Dictionary<string, string>
                {
                    ["requestId"] = created.Id,
                    ["providerUserId"] = providerUserId
                },
                cancellationToken);
        }

        await _notifications.NotifyAsync(new UserNotification
        {
            UserId = providerUserId,
            Type = "partner_contact",
            Title = "New collaboration request",
            Message = $"New request for {category.NameEn}.",
            RelatedEntityId = created.Id,
            RelatedEntityType = "ServiceContactRequest",
            ActionUrl = "/partners/requests",
            CreatedAt = now,
            UpdatedAt = now
        }, cancellationToken);

        _logger.LogInformation(
            "Partner contact {RequestId} from {Requester} to {Provider} (no field GPS shared)",
            created.Id,
            requesterUserId,
            providerUserId);

        return await ToRequestDtoAsync(created, requesterUserId, cancellationToken);
    }

    public async Task<IReadOnlyList<ServiceContactRequestDto>> GetMyRequestsAsync(
        string userId,
        string? direction,
        CancellationToken cancellationToken = default)
    {
        var incoming = await _requests.GetByProviderUserIdAsync(userId, cancellationToken);
        var outgoing = await _requests.GetByRequesterUserIdAsync(userId, cancellationToken);

        IEnumerable<ServiceContactRequest> source = direction?.ToLowerInvariant() switch
        {
            "incoming" => incoming,
            "outgoing" => outgoing,
            _ => incoming.Concat(outgoing)
        };

        var mapped = new List<ServiceContactRequestDto>();
        foreach (var request in source.OrderByDescending(r => r.CreatedAt))
        {
            mapped.Add(await ToRequestDtoAsync(request, userId, cancellationToken));
        }

        return mapped;
    }

    public async Task<ServiceContactRequestDto> UpdateRequestStatusAsync(
        string requestId,
        string userId,
        UpdateServiceContactStatusDto dto,
        CancellationToken cancellationToken = default)
    {
        var request = await _requests.GetByIdAsync(requestId, cancellationToken)
            ?? throw new NotFoundException("Request not found.");

        if (!Enum.TryParse<ServiceContactStatus>(dto.Status, true, out var next))
        {
            throw new ValidationException("Invalid status.");
        }

        var isProvider = request.ProviderUserId == userId;
        var isRequester = request.RequesterUserId == userId;
        if (!isProvider && !isRequester)
        {
            throw new ForbiddenException("You cannot update this request.");
        }

        EnsureTransition(request.Status, next, isProvider, isRequester);

        var now = _clock.UtcNow;
        if (next == ServiceContactStatus.Viewed && request.ViewedAt == null)
        {
            request.ViewedAt = now;
        }

        if (next is ServiceContactStatus.Accepted or ServiceContactStatus.Declined or ServiceContactStatus.Closed)
        {
            request.RespondedAt ??= now;
        }

        request.Status = next;
        request.UpdatedAt = now;

        if (dto.LinkTask && next == ServiceContactStatus.Accepted && isProvider && !string.IsNullOrWhiteSpace(request.TaskId))
        {
            await LinkTaskWithoutFieldAccessAsync(request, cancellationToken);
        }

        var updated = await _requests.UpdateAsync(request, cancellationToken);

        if (next == ServiceContactStatus.Accepted && !string.IsNullOrWhiteSpace(updated.FieldId))
        {
            await _activityService.RecordAsync(
                updated.FieldId,
                "partner_contact_accepted",
                "Partner collaboration accepted",
                userId,
                updated.TaskId,
                new Dictionary<string, string> { ["requestId"] = updated.Id },
                cancellationToken);
        }

        var notifyUserId = isProvider ? request.RequesterUserId : request.ProviderUserId;
        await _notifications.NotifyAsync(new UserNotification
        {
            UserId = notifyUserId,
            Type = "partner_contact_update",
            Title = "Collaboration request updated",
            Message = $"Request status is now {next}.",
            RelatedEntityId = updated.Id,
            RelatedEntityType = "ServiceContactRequest",
            ActionUrl = "/partners/requests",
            CreatedAt = now,
            UpdatedAt = now
        }, cancellationToken);

        return await ToRequestDtoAsync(updated, userId, cancellationToken);
    }

    /// <summary>
    /// Links the partner to the FieldTask via AssignedCollaboratorId without AssignedUserId
    /// or field membership. FieldAccessService continues to ignore collaborator assignment.
    /// </summary>
    private async Task LinkTaskWithoutFieldAccessAsync(ServiceContactRequest request, CancellationToken cancellationToken)
    {
        var task = await _fieldTasks.GetByIdAsync(request.TaskId!, cancellationToken);
        if (task == null)
        {
            return;
        }

        // Collaborator assignment does not grant field access (unlike AssignedUserId).
        task.AssignedCollaboratorId = request.ProviderUserId;
        await _fieldTasks.UpdateAsync(task, cancellationToken);
        _logger.LogInformation(
            "Linked partner {PartnerUserId} to field task {TaskId} without granting field access",
            request.ProviderUserId,
            task.Id);
    }

    private static void EnsureTransition(
        ServiceContactStatus current,
        ServiceContactStatus next,
        bool isProvider,
        bool isRequester)
    {
        var allowed = (current, next, isProvider, isRequester) switch
        {
            (ServiceContactStatus.New, ServiceContactStatus.Viewed, true, _) => true,
            (ServiceContactStatus.New, ServiceContactStatus.Accepted, true, _) => true,
            (ServiceContactStatus.New, ServiceContactStatus.Declined, true, _) => true,
            (ServiceContactStatus.Viewed, ServiceContactStatus.Accepted, true, _) => true,
            (ServiceContactStatus.Viewed, ServiceContactStatus.Declined, true, _) => true,
            (ServiceContactStatus.Accepted, ServiceContactStatus.Closed, _, _) => true,
            (ServiceContactStatus.Declined, ServiceContactStatus.Closed, _, _) => true,
            (ServiceContactStatus.New, ServiceContactStatus.Closed, _, true) => true,
            (ServiceContactStatus.Viewed, ServiceContactStatus.Closed, _, true) => true,
            _ when current == next => true,
            _ => false
        };

        if (!allowed)
        {
            throw new ValidationException($"Cannot change status from {current} to {next}.");
        }
    }

    /// <summary>
    /// Parent search includes children; a child search also matches a parent listing.
    /// </summary>
    public static HashSet<string> MatchingCategoryIds(
        ServiceCategory selected,
        IReadOnlyList<ServiceCategory> all)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal) { selected.Id };
        if (!string.IsNullOrWhiteSpace(selected.ParentCategoryId))
        {
            ids.Add(selected.ParentCategoryId);
        }

        foreach (var child in all.Where(c => c.ParentCategoryId == selected.Id))
        {
            ids.Add(child.Id);
        }

        return ids;
    }

    public static bool OffersAny(IEnumerable<string> profileCategoryIds, IReadOnlySet<string> matchingIds) =>
        profileCategoryIds.Any(matchingIds.Contains);

    public static double Rank(NearbyProviderMatch match, IReadOnlySet<string>? matchingCategoryIds)
    {
        var profile = match.Profile;
        var score = 0d;
        if (matchingCategoryIds is { Count: > 0 } && OffersAny(profile.ServiceCategoryIds, matchingCategoryIds))
        {
            score += 40;
        }

        score += Math.Max(0, 30 - match.DistanceKm * 0.3);
        score += profile.Availability switch
        {
            ProviderAvailability.Available => 20,
            ProviderAvailability.Limited => 10,
            _ => 0
        };
        if (PartnerMapping.IsVerified(profile.VerificationStatus))
        {
            score += 12;
        }

        score += profile.CompletenessScore * 0.08;
        return score;
    }

    public static int NormalizeRadius(int? radiusKm)
    {
        if (radiusKm is null or <= 0)
        {
            return 50;
        }

        return DefaultRadiiKm.MinBy(r => Math.Abs(r - radiusKm.Value));
    }

    public static int NextRadius(int radiusKm)
    {
        var next = DefaultRadiiKm.FirstOrDefault(r => r > radiusKm);
        return next == 0 ? radiusKm : next;
    }

    private async Task<ServiceProviderProfile> RequireProfileAsync(string userId, CancellationToken cancellationToken)
    {
        return await _profiles.GetByUserIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("Service profile not found. Enable offering services first.");
    }

    private async Task EnsureCategoriesExistAsync(IEnumerable<string> ids, CancellationToken cancellationToken)
    {
        foreach (var id in ids.Where(i => !string.IsNullOrWhiteSpace(i)))
        {
            var category = await _categories.GetByIdAsync(id, cancellationToken);
            if (category == null || !category.IsActive)
            {
                throw new ValidationException($"Unknown service category: {id}");
            }
        }
    }

    private async Task<ServiceCategory?> ResolveCategoryAsync(
        string? categoryId,
        string? categorySlug,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(categoryId))
        {
            return await _categories.GetByIdAsync(categoryId, cancellationToken)
                ?? throw new ValidationException("Unknown service category.");
        }

        if (!string.IsNullOrWhiteSpace(categorySlug))
        {
            return await _categories.GetBySlugAsync(categorySlug, cancellationToken)
                ?? throw new ValidationException("Unknown service category.");
        }

        return null;
    }

    private async Task<ServiceProviderProfileDto> ToOwnerDtoAsync(
        ServiceProviderProfile profile,
        CancellationToken cancellationToken)
    {
        var categories = await LoadCategoriesAsync(profile.ServiceCategoryIds, cancellationToken);
        return new ServiceProviderProfileDto
        {
            Id = profile.Id,
            UserId = profile.UserId,
            DisplayName = profile.DisplayName,
            PhotoUrl = profile.PhotoUrl,
            BusinessName = profile.BusinessName,
            ProviderKind = profile.ProviderKind.ToString(),
            ServiceCategoryIds = profile.ServiceCategoryIds,
            Categories = categories,
            BaseAreaLabel = profile.BaseAreaLabel,
            ServiceRadiusKm = profile.ServiceRadiusKm,
            ServiceAreas = profile.ServiceAreas,
            ShortDescription = profile.ShortDescription,
            ExperienceYears = profile.ExperienceYears,
            CrewSize = profile.CrewSize,
            Equipment = profile.Equipment,
            MillOperatingPeriod = profile.MillOperatingPeriod,
            MillProcessingMethod = profile.MillProcessingMethod,
            MillOrganic = profile.MillOrganic,
            MillAppointmentRequired = profile.MillAppointmentRequired,
            Languages = profile.Languages,
            Certifications = profile.Certifications,
            ContactPreference = profile.ContactPreference.ToString(),
            ShowPhone = profile.ShowPhone,
            PhoneNumber = profile.PhoneNumber,
            Availability = profile.Availability.ToString(),
            AvailableFrom = profile.AvailableFrom,
            AvailableUntil = profile.AvailableUntil,
            IsPaused = profile.IsPaused,
            VerificationStatus = profile.VerificationStatus.ToString(),
            IsVerified = PartnerMapping.IsVerified(profile.VerificationStatus),
            PricingNote = profile.PricingNote,
            IsListed = profile.IsListed,
            CompletenessScore = profile.CompletenessScore,
            HasBaseLocation = profile.HasUsableLocation(),
            CreatedAt = profile.CreatedAt,
            UpdatedAt = profile.UpdatedAt
        };
    }

    private static PartnerSearchResultDto ToSearchResult(
        NearbyProviderMatch match,
        IReadOnlyDictionary<string, ServiceCategory> categories)
    {
        var profile = match.Profile;
        return new PartnerSearchResultDto
        {
            UserId = profile.UserId,
            DisplayName = profile.DisplayName,
            PhotoUrl = profile.PhotoUrl,
            BusinessName = profile.BusinessName,
            ProviderKind = profile.ProviderKind.ToString(),
            Categories = profile.ServiceCategoryIds
                .Where(categories.ContainsKey)
                .Select(id => PartnerMapping.ToDto(categories[id]))
                .ToList(),
            DistanceKm = Math.Max(1, (int)Math.Round(match.DistanceKm)),
            Availability = profile.Availability.ToString(),
            ExperienceYears = profile.ExperienceYears,
            CrewSize = profile.CrewSize,
            Equipment = profile.Equipment,
            IsVerified = PartnerMapping.IsVerified(profile.VerificationStatus),
            VerificationStatus = profile.VerificationStatus.ToString(),
            CompletenessScore = profile.CompletenessScore,
            ServiceRadiusKm = profile.ServiceRadiusKm,
            BaseAreaLabel = profile.BaseAreaLabel,
            PricingNote = profile.PricingNote
        };
    }

    private async Task<List<ServiceCategoryDto>> LoadCategoriesAsync(
        IEnumerable<string> ids,
        CancellationToken cancellationToken)
    {
        var result = new List<ServiceCategoryDto>();
        foreach (var id in ids)
        {
            var category = await _categories.GetByIdAsync(id, cancellationToken);
            if (category != null)
            {
                result.Add(PartnerMapping.ToDto(category));
            }
        }

        return result;
    }

    private async Task<ServiceContactRequestDto> ToRequestDtoAsync(
        ServiceContactRequest request,
        string viewerUserId,
        CancellationToken cancellationToken)
    {
        var isProvider = request.ProviderUserId == viewerUserId;
        var category = await _categories.GetByIdAsync(request.ServiceCategoryId, cancellationToken);
        var requester = await _users.GetByIdAsync(request.RequesterUserId, cancellationToken);
        var provider = await _profiles.GetByUserIdAsync(request.ProviderUserId, cancellationToken);

        return new ServiceContactRequestDto
        {
            Id = request.Id,
            RequesterUserId = request.RequesterUserId,
            ProviderUserId = request.ProviderUserId,
            RequesterName = DisplayUser(requester),
            ProviderName = provider?.DisplayName,
            ServiceCategoryId = request.ServiceCategoryId,
            Category = category == null ? null : PartnerMapping.ToDto(category),
            FieldId = isProvider ? null : request.FieldId,
            TaskId = isProvider ? request.TaskId : request.TaskId,
            ApproximateArea = request.ApproximateArea,
            AreaHectares = request.AreaHectares,
            SuggestedStart = request.SuggestedStart,
            SuggestedEnd = request.SuggestedEnd,
            Message = request.Message,
            Status = request.Status.ToString(),
            ContactMethod = request.ContactMethod,
            Direction = isProvider ? "incoming" : "outgoing",
            CreatedAt = request.CreatedAt,
            UpdatedAt = request.UpdatedAt
        };
    }

    private static string? DisplayUser(User? user)
    {
        if (user == null)
        {
            return null;
        }

        var name = string.Join(" ", new[] { user.FirstName, user.LastName }.Where(s => !string.IsNullOrWhiteSpace(s))).Trim();
        return string.IsNullOrWhiteSpace(name) ? user.Email : name;
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
