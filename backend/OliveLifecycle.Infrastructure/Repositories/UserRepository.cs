using MongoDB.Driver;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;

namespace OliveLifecycle.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IMongoCollection<User> _collection;

    public UserRepository(MongoDbContext context)
    {
        _collection = context.GetCollection<User>("users");
        
        // Create index on email for faster lookups
        var indexOptions = new CreateIndexOptions { Unique = true };
        var indexDefinition = Builders<User>.IndexKeys.Ascending(u => u.Email);
        _collection.Indexes.CreateOne(new CreateIndexModel<User>(indexDefinition, indexOptions));
    }

    public async Task<User?> GetByIdAsync(string id)
    {
        return await _collection.Find(u => u.Id == id).FirstOrDefaultAsync();
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _collection.Find(u => u.Email == email).FirstOrDefaultAsync();
    }

    public async Task<User> CreateAsync(User user)
    {
        await _collection.InsertOneAsync(user);
        return user;
    }

    public async Task<User> UpdateAsync(User user)
    {
        user.UpdatedAt = DateTime.UtcNow;
        await _collection.ReplaceOneAsync(u => u.Id == user.Id, user);
        return user;
    }

    public async Task<bool> ExistsByEmailAsync(string email)
    {
        var count = await _collection.CountDocumentsAsync(u => u.Email == email);
        return count > 0;
    }

    public async Task<IEnumerable<User>> GetByRoleAsync(string role)
    {
        return await _collection.Find(u => u.Role == role).ToListAsync();
    }
}
