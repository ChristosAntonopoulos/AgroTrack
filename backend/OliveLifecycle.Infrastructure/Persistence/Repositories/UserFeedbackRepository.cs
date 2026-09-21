using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class UserFeedbackRepository
    : MongoRepositoryBase<UserFeedbackDocument, UserFeedback>, IUserFeedbackRepository
{
    public UserFeedbackRepository(MongoDbContext context) : base(context, "user_feedback")
    {
    }

    protected override UserFeedbackDocument ToDocument(UserFeedback entity) =>
        UserFeedbackMapper.ToDocument(entity);

    protected override UserFeedback ToEntity(UserFeedbackDocument document) =>
        UserFeedbackMapper.ToEntity(document);

    protected override FilterDefinition<UserFeedbackDocument> BuildIdFilter(string id) =>
        Builders<UserFeedbackDocument>.Filter.Eq(f => f.Id, id);

    public async Task<(IReadOnlyList<UserFeedback> Items, int Total)> GetNewestPageAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var total = (int)await Collection.CountDocumentsAsync(
            FilterDefinition<UserFeedbackDocument>.Empty,
            cancellationToken: cancellationToken);
        var documents = await Collection
            .Find(FilterDefinition<UserFeedbackDocument>.Empty)
            .SortByDescending(f => f.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync(cancellationToken);
        return (documents.Select(ToEntity).ToList(), total);
    }

    public async Task<int> CountUnseenAsync(CancellationToken cancellationToken = default)
    {
        return (int)await Collection.CountDocumentsAsync(
            Builders<UserFeedbackDocument>.Filter.Eq(f => f.SeenAt, null),
            cancellationToken: cancellationToken);
    }
}
