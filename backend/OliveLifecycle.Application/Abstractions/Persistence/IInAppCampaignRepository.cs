using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IInAppCampaignRepository
{
    Task<InAppCampaign?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InAppCampaign>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InAppCampaign>> GetPublishedActiveAsync(DateTime now, CancellationToken cancellationToken = default);
    Task<InAppCampaign> CreateAsync(InAppCampaign entity, CancellationToken cancellationToken = default);
    Task<InAppCampaign> UpdateAsync(InAppCampaign entity, CancellationToken cancellationToken = default);
}

public interface ICampaignEngagementRepository
{
    Task<CampaignEngagement?> GetAsync(string userId, string campaignId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CampaignEngagement>> GetByUserAsync(string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CampaignEngagement>> GetByCampaignAsync(string campaignId, CancellationToken cancellationToken = default);
    Task UpsertAsync(CampaignEngagement entity, CancellationToken cancellationToken = default);
}

public interface ICampaignAnswerRepository
{
    Task<IReadOnlyList<CampaignAnswer>> GetByUserAndCampaignAsync(
        string userId,
        string campaignId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CampaignAnswer>> GetByCampaignAsync(
        string campaignId,
        CancellationToken cancellationToken = default);

    Task UpsertAsync(CampaignAnswer entity, CancellationToken cancellationToken = default);
}
