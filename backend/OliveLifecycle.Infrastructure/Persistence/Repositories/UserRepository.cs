using System.Text.RegularExpressions;
using MongoDB.Bson;
using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class UserRepository : MongoRepositoryBase<UserDocument, User>, IUserRepository
{
    public UserRepository(MongoDbContext context) : base(context, "users")
    {
    }

    protected override UserDocument ToDocument(User entity) => UserMapper.ToDocument(entity);
    protected override User ToEntity(UserDocument document) => UserMapper.ToEntity(document);
    protected override FilterDefinition<UserDocument> BuildIdFilter(string id) =>
        Builders<UserDocument>.Filter.Eq(u => u.Id, id);

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var document = await Collection.Find(u => u.Email == normalized).FirstOrDefaultAsync(cancellationToken);
        if (document != null)
        {
            return ToEntity(document);
        }

        // Legacy records may have mixed-case emails.
        var escaped = Regex.Escape(email.Trim());
        var filter = Builders<UserDocument>.Filter.Regex(
            u => u.Email,
            new BsonRegularExpression($"^{escaped}$", "i"));
        document = await Collection.Find(filter).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }

    public async Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await GetByEmailAsync(email, cancellationToken);
        return user != null;
    }

    public async Task<IEnumerable<User>> GetByRoleAsync(string role, CancellationToken cancellationToken = default)
    {
        var documents = await Collection.Find(u => u.Role == role).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }
}
