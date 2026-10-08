using MongoDB.Bson;
using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly IMongoCollection<RefreshTokenDocument> _collection;

    public RefreshTokenRepository(MongoDbContext context)
    {
        _collection = context.GetCollection<RefreshTokenDocument>("refresh_tokens");
    }

    public async Task<RefreshToken> CreateAsync(RefreshToken token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token.Id))
        {
            token.Id = ObjectId.GenerateNewId().ToString();
        }

        var document = RefreshTokenMapper.ToDocument(token);
        await _collection.InsertOneAsync(document, cancellationToken: cancellationToken);
        return RefreshTokenMapper.ToEntity(document);
    }

    public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        var document = await _collection
            .Find(t => t.TokenHash == tokenHash)
            .FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : RefreshTokenMapper.ToEntity(document);
    }

    public async Task UpdateAsync(RefreshToken token, CancellationToken cancellationToken = default)
    {
        token.UpdatedAt = DateTime.UtcNow;
        var document = RefreshTokenMapper.ToDocument(token);
        await _collection.ReplaceOneAsync(
            t => t.Id == token.Id,
            document,
            cancellationToken: cancellationToken);
    }

    public async Task RevokeAllForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        await _collection.UpdateManyAsync(
            t => t.UserId == userId && t.RevokedAt == null,
            Builders<RefreshTokenDocument>.Update
                .Set(t => t.RevokedAt, now)
                .Set(t => t.UpdatedAt, now),
            cancellationToken: cancellationToken);
    }
}
