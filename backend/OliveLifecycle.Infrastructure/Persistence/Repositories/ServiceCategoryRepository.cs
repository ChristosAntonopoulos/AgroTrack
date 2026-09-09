using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class ServiceCategoryRepository : MongoRepositoryBase<ServiceCategoryDocument, ServiceCategory>, IServiceCategoryRepository
{
    public ServiceCategoryRepository(MongoDbContext context) : base(context, "service_categories")
    {
    }

    protected override ServiceCategoryDocument ToDocument(ServiceCategory entity) => ServiceCategoryMapper.ToDocument(entity);
    protected override ServiceCategory ToEntity(ServiceCategoryDocument document) => ServiceCategoryMapper.ToEntity(document);
    protected override FilterDefinition<ServiceCategoryDocument> BuildIdFilter(string id) =>
        Builders<ServiceCategoryDocument>.Filter.Eq(c => c.Id, id);

    public async Task<IReadOnlyList<ServiceCategory>> GetAllAsync(bool activeOnly, CancellationToken cancellationToken = default)
    {
        var filter = activeOnly
            ? Builders<ServiceCategoryDocument>.Filter.Eq(c => c.IsActive, true)
            : FilterDefinition<ServiceCategoryDocument>.Empty;
        var documents = await Collection
            .Find(filter)
            .SortBy(c => c.SortOrder)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<ServiceCategory?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        var document = await Collection.Find(c => c.Slug == slug).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }
}
