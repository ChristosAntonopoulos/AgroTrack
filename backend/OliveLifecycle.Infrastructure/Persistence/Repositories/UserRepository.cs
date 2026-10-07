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

    public async Task<User?> GetByPasswordResetTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return null;
        }

        var document = await Collection
            .Find(u => u.PasswordResetTokenHash == tokenHash)
            .FirstOrDefaultAsync(cancellationToken);
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

    public async Task<IEnumerable<User>> GetByIdsAsync(IEnumerable<string> userIds, CancellationToken cancellationToken = default)
    {
        var ids = userIds
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (ids.Count == 0)
        {
            return Enumerable.Empty<User>();
        }

        var filter = Builders<UserDocument>.Filter.In(u => u.Id, ids);
        var documents = await Collection.Find(filter).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    public async Task<int> CountActiveAsync(CancellationToken cancellationToken = default)
    {
        var filter = Builders<UserDocument>.Filter.Eq(u => u.DeletedAt, null);
        return (int)await Collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
    }

    public async Task<int> CountCreatedSinceAsync(DateTime sinceUtc, CancellationToken cancellationToken = default)
    {
        var filter = Builders<UserDocument>.Filter.And(
            Builders<UserDocument>.Filter.Eq(u => u.DeletedAt, null),
            Builders<UserDocument>.Filter.Gte(u => u.CreatedAt, sinceUtc));
        return (int)await Collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
    }

    public async Task<int> CountSeenSinceAsync(DateTime sinceUtc, CancellationToken cancellationToken = default)
    {
        var filter = Builders<UserDocument>.Filter.And(
            Builders<UserDocument>.Filter.Eq(u => u.DeletedAt, null),
            Builders<UserDocument>.Filter.Gte(u => u.LastSeenAt, sinceUtc));
        return (int)await Collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
    }

    public async Task<(IReadOnlyList<User> Items, int Total)> SearchPageAsync(
        string? search,
        string? role,
        int page,
        int pageSize,
        string sortBy,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var filter = BuildSearchFilter(search, role);
        var total = (int)await Collection.CountDocumentsAsync(filter, cancellationToken: cancellationToken);

        var sort = string.Equals(sortBy, "lastSeenAt", StringComparison.OrdinalIgnoreCase)
            ? Builders<UserDocument>.Sort.Descending(u => u.LastSeenAt).Descending(u => u.CreatedAt)
            : Builders<UserDocument>.Sort.Descending(u => u.CreatedAt);

        var documents = await Collection
            .Find(filter)
            .Sort(sort)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync(cancellationToken);
        return (documents.Select(ToEntity).ToList(), total);
    }

    public async Task<IReadOnlyList<User>> GetNewestAsync(int limit, CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 50);
        var filter = Builders<UserDocument>.Filter.Eq(u => u.DeletedAt, null);
        var documents = await Collection
            .Find(filter)
            .SortByDescending(u => u.CreatedAt)
            .Limit(limit)
            .ToListAsync(cancellationToken);
        return documents.Select(ToEntity).ToList();
    }

    public async Task<bool> TouchLastSeenAsync(
        string userId,
        DateTime nowUtc,
        TimeSpan minAge,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId) || !ObjectId.TryParse(userId, out _))
        {
            return false;
        }

        var staleBefore = nowUtc - minAge;
        var filter = Builders<UserDocument>.Filter.And(
            Builders<UserDocument>.Filter.Eq(u => u.Id, userId),
            Builders<UserDocument>.Filter.Or(
                Builders<UserDocument>.Filter.Eq(u => u.LastSeenAt, null),
                Builders<UserDocument>.Filter.Lt(u => u.LastSeenAt, staleBefore)));

        var update = Builders<UserDocument>.Update
            .Set(u => u.LastSeenAt, nowUtc)
            .Set(u => u.UpdatedAt, nowUtc);

        var result = await Collection.UpdateOneAsync(filter, update, cancellationToken: cancellationToken);
        return result.ModifiedCount > 0;
    }

    private static FilterDefinition<UserDocument> BuildSearchFilter(string? search, string? role)
    {
        var filters = new List<FilterDefinition<UserDocument>>
        {
            Builders<UserDocument>.Filter.Eq(u => u.DeletedAt, null)
        };

        if (!string.IsNullOrWhiteSpace(role))
        {
            filters.Add(Builders<UserDocument>.Filter.Eq(u => u.Role, role.Trim()));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            var escaped = Regex.Escape(term);
            var regex = new BsonRegularExpression(escaped, "i");
            filters.Add(Builders<UserDocument>.Filter.Or(
                Builders<UserDocument>.Filter.Regex(u => u.Email, regex),
                Builders<UserDocument>.Filter.Regex(u => u.FirstName!, regex),
                Builders<UserDocument>.Filter.Regex(u => u.LastName!, regex)));
        }

        return Builders<UserDocument>.Filter.And(filters);
    }
}
