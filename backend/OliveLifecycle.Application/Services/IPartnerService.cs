using OliveLifecycle.Application.DTOs.Partners;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Services;

public interface IPartnerService
{
    Task<IReadOnlyList<ServiceCategoryDto>> GetCategoriesAsync(bool activeOnly, CancellationToken cancellationToken = default);
    Task<ServiceProviderProfileDto?> GetMyProfileAsync(string userId, CancellationToken cancellationToken = default);
    Task<ServiceProviderProfileDto> ActivateAsync(string userId, CancellationToken cancellationToken = default);
    Task<ServiceProviderProfileDto> PauseAsync(string userId, CancellationToken cancellationToken = default);
    Task<ServiceProviderProfileDto> UpsertMyProfileAsync(string userId, UpsertServiceProfileDto dto, CancellationToken cancellationToken = default);
    Task<PartnerSearchResponseDto> SearchAsync(string userId, string userRole, string fieldId, string? categoryId, string? categorySlug, int? radiusKm, string? availability, string? providerKind, bool verifiedOnly, CancellationToken cancellationToken = default);
    Task<PartnerPublicProfileDto> GetPublicProfileAsync(string providerUserId, CancellationToken cancellationToken = default);
    Task<ServiceContactRequestDto> ContactAsync(string requesterUserId, string userRole, string providerUserId, CreatePartnerContactDto dto, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ServiceContactRequestDto>> GetMyRequestsAsync(string userId, string? direction, CancellationToken cancellationToken = default);
    Task<ServiceContactRequestDto> UpdateRequestStatusAsync(string requestId, string userId, UpdateServiceContactStatusDto dto, CancellationToken cancellationToken = default);
}

public interface IUserNotificationService
{
    Task<IReadOnlyList<UserNotificationDto>> GetMineAsync(string userId, CancellationToken cancellationToken = default);
    Task MarkReadAsync(string notificationId, string userId, CancellationToken cancellationToken = default);
    Task NotifyAsync(UserNotification notification, CancellationToken cancellationToken = default);
}

public static class PartnerMapping
{
    public static ServiceCategoryDto ToDto(ServiceCategory category) => new()
    {
        Id = category.Id,
        Slug = category.Slug,
        Name = new LocalizedTextDto { El = category.NameEl, En = category.NameEn, It = category.NameIt },
        Description = new LocalizedTextDto
        {
            El = category.DescriptionEl ?? string.Empty,
            En = category.DescriptionEn ?? string.Empty,
            It = category.DescriptionIt ?? string.Empty
        },
        Icon = category.Icon,
        ParentCategoryId = category.ParentCategoryId,
        SortOrder = category.SortOrder,
        IsActive = category.IsActive,
        IsProminent = category.IsProminent,
        SuggestedTaskTypes = category.SuggestedTaskTypes
    };

    public static bool IsVerified(VerificationStatus status) => status != VerificationStatus.Unverified;
}
