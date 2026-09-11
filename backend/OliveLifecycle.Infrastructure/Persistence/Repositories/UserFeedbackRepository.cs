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
}
