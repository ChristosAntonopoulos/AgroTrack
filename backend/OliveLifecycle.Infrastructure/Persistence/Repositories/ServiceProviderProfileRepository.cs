using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class ServiceProviderProfileRepository
    : MongoRepositoryBase<ServiceProviderProfileDocument, ServiceProviderProfile>, IServiceProviderProfileRepository
{
    public ServiceProviderProfileRepository(MongoDbContext context) : base(context, "service_provider_profiles")
    {
    }

    protected override ServiceProviderProfileDocument ToDocument(ServiceProviderProfile entity) =>
        ServiceProviderProfileMapper.ToDocument(entity);

    protected override ServiceProviderProfile ToEntity(ServiceProviderProfileDocument document) =>
        ServiceProviderProfileMapper.ToEntity(document);

    protected override FilterDefinition<ServiceProviderProfileDocument> BuildIdFilter(string id) =>
        Builders<ServiceProviderProfileDocument>.Filter.Eq(p => p.Id, id);

    public async Task<ServiceProviderProfile?> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        var document = await Collection.Find(p => p.UserId == userId).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }

    public async Task<IReadOnlyList<ServiceProviderProfile>> GetByUserIdsAsync(
        IEnumerable<string> userIds,
        CancellationToken cancellationToken = default)
    {
        var ids = userIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        var documents = await Collection.Find(p => ids.Contains(p.UserId)).ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<IReadOnlyList<NearbyProviderMatch>> FindNearbyListedAsync(
        double latitude,
        double longitude,
        double maxDistanceKm,
        CancellationToken cancellationToken = default)
    {
        var maxMeters = Math.Max(1, maxDistanceKm) * 1000;

        var geoNear = new BsonDocument("$geoNear", new BsonDocument
        {
            { "near", new BsonDocument
                {
                    { "type", "Point" },
                    { "coordinates", new BsonArray { longitude, latitude } }
                }
            },
            { "distanceField", "distanceMeters" },
            { "maxDistance", maxMeters },
            { "spherical", true },
            { "key", "baseLocation" },
            { "query", new BsonDocument
                {
                    { "isListed", true },
                    { "isPaused", false }
                }
            }
        });

        var results = await Collection.Aggregate()
            .AppendStage<NearbyProfileDocument>(geoNear)
            .Limit(100)
            .ToListAsync(cancellationToken);

        return results
            .Select(doc => new NearbyProviderMatch(
                ServiceProviderProfileMapper.ToEntity(doc),
                doc.DistanceMeters / 1000.0))
            .ToList();
    }

    private class NearbyProfileDocument : ServiceProviderProfileDocument
    {
        [BsonElement("distanceMeters")]
        public double DistanceMeters { get; set; }
    }
}
