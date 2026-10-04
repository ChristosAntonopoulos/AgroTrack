using OliveLifecycle.Application.DTOs.Campaigns;

namespace OliveLifecycle.Application.Services;

public interface IAdminCampaignService
{
    Task<IReadOnlyList<InAppCampaignDto>> ListAsync(CancellationToken cancellationToken = default);
    Task<InAppCampaignDto?> GetAsync(string id, CancellationToken cancellationToken = default);
    Task<InAppCampaignDto> CreateAsync(UpsertInAppCampaignDto request, CancellationToken cancellationToken = default);
    Task<InAppCampaignDto> UpdateAsync(string id, UpsertInAppCampaignDto request, CancellationToken cancellationToken = default);
    Task<InAppCampaignDto> PublishAsync(string id, CancellationToken cancellationToken = default);
    Task<InAppCampaignDto> ArchiveAsync(string id, CancellationToken cancellationToken = default);
    Task<CampaignResponsesDto> GetResponsesAsync(string id, CancellationToken cancellationToken = default);
}

public interface IInAppMessageService
{
    Task<IReadOnlyList<InboxItemDto>> GetInboxAsync(
        string userId,
        string role,
        string locale,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InAppMessageDto>> GetPendingModalsAsync(
        string userId,
        string role,
        string locale,
        CancellationToken cancellationToken = default);

    Task<InAppMessageDto> GetMessageAsync(
        string campaignId,
        string userId,
        string role,
        string locale,
        CancellationToken cancellationToken = default);

    Task MarkSeenAsync(string campaignId, string userId, string role, CancellationToken cancellationToken = default);
    Task DismissAsync(string campaignId, string userId, string role, CancellationToken cancellationToken = default);

    Task<InAppMessageDto> RespondAsync(
        string campaignId,
        string userId,
        string role,
        string? displayName,
        string locale,
        RespondInAppMessageDto request,
        CancellationToken cancellationToken = default);
}
