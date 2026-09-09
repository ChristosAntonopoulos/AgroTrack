using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class ServiceContactRequestRepository
    : MongoRepositoryBase<ServiceContactRequestDocument, ServiceContactRequest>, IServiceContactRequestRepository
{
    public ServiceContactRequestRepository(MongoDbContext context) : base(context, "service_contact_requests")
    {
    }

    protected override ServiceContactRequestDocument ToDocument(ServiceContactRequest entity) =>
        ServiceContactRequestMapper.ToDocument(entity);

    protected override ServiceContactRequest ToEntity(ServiceContactRequestDocument document) =>
        ServiceContactRequestMapper.ToEntity(document);

    protected override FilterDefinition<ServiceContactRequestDocument> BuildIdFilter(string id) =>
        Builders<ServiceContactRequestDocument>.Filter.Eq(r => r.Id, id);

    public async Task<IReadOnlyList<ServiceContactRequest>> GetByProviderUserIdAsync(
        string providerUserId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(r => r.ProviderUserId == providerUserId)
            .SortByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<ServiceContactRequest>> GetByRequesterUserIdAsync(
        string requesterUserId,
        CancellationToken cancellationToken = default)
    {
        var documents = await Collection
            .Find(r => r.RequesterUserId == requesterUserId)
            .SortByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }
}
