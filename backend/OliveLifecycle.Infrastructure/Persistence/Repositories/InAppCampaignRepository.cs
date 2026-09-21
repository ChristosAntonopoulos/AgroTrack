using MongoDB.Bson;
using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class InAppCampaignRepository : IInAppCampaignRepository
{
    private readonly IMongoCollection<InAppCampaignDocument> _campaigns;

    public InAppCampaignRepository(MongoDbContext context)
    {
        _campaigns = context.GetCollection<InAppCampaignDocument>("in_app_campaigns");
    }

    public async Task<InAppCampaign?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var document = await _campaigns.Find(c => c.Id == id).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : InAppCampaignMapper.ToEntity(document);
    }

    public async Task<IReadOnlyList<InAppCampaign>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var documents = await _campaigns
            .Find(FilterDefinition<InAppCampaignDocument>.Empty)
            .SortByDescending(c => c.UpdatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(InAppCampaignMapper.ToEntity).ToList();
    }

    public async Task<IReadOnlyList<InAppCampaign>> GetPublishedActiveAsync(
        DateTime now,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<InAppCampaignDocument>.Filter.And(
            Builders<InAppCampaignDocument>.Filter.Eq(c => c.Status, CampaignStatuses.Published),
            Builders<InAppCampaignDocument>.Filter.Or(
                Builders<InAppCampaignDocument>.Filter.Eq(c => c.StartsAt, null),
                Builders<InAppCampaignDocument>.Filter.Lte(c => c.StartsAt, now)),
            Builders<InAppCampaignDocument>.Filter.Or(
                Builders<InAppCampaignDocument>.Filter.Eq(c => c.EndsAt, null),
                Builders<InAppCampaignDocument>.Filter.Gte(c => c.EndsAt, now)));

        var documents = await _campaigns
            .Find(filter)
            .SortByDescending(c => c.PublishedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(InAppCampaignMapper.ToEntity).ToList();
    }

    public async Task<InAppCampaign> CreateAsync(InAppCampaign entity, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(entity.Id))
        {
            entity.Id = ObjectId.GenerateNewId().ToString();
        }

        var now = DateTime.UtcNow;
        entity.CreatedAt = now;
        entity.UpdatedAt = now;
        await _campaigns.InsertOneAsync(InAppCampaignMapper.ToDocument(entity), cancellationToken: cancellationToken);
        return entity;
    }

    public async Task<InAppCampaign> UpdateAsync(InAppCampaign entity, CancellationToken cancellationToken = default)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        await _campaigns.ReplaceOneAsync(
            c => c.Id == entity.Id,
            InAppCampaignMapper.ToDocument(entity),
            cancellationToken: cancellationToken);
        return entity;
    }
}

public class CampaignEngagementRepository : ICampaignEngagementRepository
{
    private readonly IMongoCollection<CampaignEngagementDocument> _engagements;

    public CampaignEngagementRepository(MongoDbContext context)
    {
        _engagements = context.GetCollection<CampaignEngagementDocument>("campaign_engagements");
    }

    public async Task<CampaignEngagement?> GetAsync(
        string userId,
        string campaignId,
        CancellationToken cancellationToken = default)
    {
        var document = await _engagements
            .Find(e => e.UserId == userId && e.CampaignId == campaignId)
            .FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : InAppCampaignMapper.ToEngagementEntity(document);
    }

    public async Task<IReadOnlyList<CampaignEngagement>> GetByUserAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var documents = await _engagements.Find(e => e.UserId == userId).ToListAsync(cancellationToken);
        return documents.Select(InAppCampaignMapper.ToEngagementEntity).ToList();
    }

    public async Task<IReadOnlyList<CampaignEngagement>> GetByCampaignAsync(
        string campaignId,
        CancellationToken cancellationToken = default)
    {
        var documents = await _engagements.Find(e => e.CampaignId == campaignId).ToListAsync(cancellationToken);
        return documents.Select(InAppCampaignMapper.ToEngagementEntity).ToList();
    }

    public async Task UpsertAsync(CampaignEngagement entity, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var existing = await _engagements
            .Find(e => e.UserId == entity.UserId && e.CampaignId == entity.CampaignId)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing != null)
        {
            entity.Id = existing.Id;
            entity.CreatedAt = existing.CreatedAt;
        }
        else if (string.IsNullOrWhiteSpace(entity.Id))
        {
            entity.Id = ObjectId.GenerateNewId().ToString();
            entity.CreatedAt = now;
        }

        entity.UpdatedAt = now;
        await _engagements.ReplaceOneAsync(
            e => e.UserId == entity.UserId && e.CampaignId == entity.CampaignId,
            InAppCampaignMapper.ToEngagementDocument(entity),
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);
    }
}

public class CampaignAnswerRepository : ICampaignAnswerRepository
{
    private readonly IMongoCollection<CampaignAnswerDocument> _answers;

    public CampaignAnswerRepository(MongoDbContext context)
    {
        _answers = context.GetCollection<CampaignAnswerDocument>("campaign_answers");
    }

    public async Task<IReadOnlyList<CampaignAnswer>> GetByUserAndCampaignAsync(
        string userId,
        string campaignId,
        CancellationToken cancellationToken = default)
    {
        var documents = await _answers
            .Find(a => a.UserId == userId && a.CampaignId == campaignId)
            .ToListAsync(cancellationToken);
        return documents.Select(InAppCampaignMapper.ToAnswerEntity).ToList();
    }

    public async Task<IReadOnlyList<CampaignAnswer>> GetByCampaignAsync(
        string campaignId,
        CancellationToken cancellationToken = default)
    {
        var documents = await _answers
            .Find(a => a.CampaignId == campaignId)
            .SortByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(InAppCampaignMapper.ToAnswerEntity).ToList();
    }

    public async Task UpsertAsync(CampaignAnswer entity, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var existing = await _answers
            .Find(a =>
                a.UserId == entity.UserId
                && a.CampaignId == entity.CampaignId
                && a.QuestionId == entity.QuestionId)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing != null)
        {
            entity.Id = existing.Id;
            entity.CreatedAt = existing.CreatedAt;
        }
        else if (string.IsNullOrWhiteSpace(entity.Id))
        {
            entity.Id = ObjectId.GenerateNewId().ToString();
            entity.CreatedAt = now;
        }

        entity.UpdatedAt = now;
        await _answers.ReplaceOneAsync(
            a => a.UserId == entity.UserId
                && a.CampaignId == entity.CampaignId
                && a.QuestionId == entity.QuestionId,
            InAppCampaignMapper.ToAnswerDocument(entity),
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);
    }
}
