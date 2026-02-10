using MongoDB.Driver;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;

namespace OliveLifecycle.Infrastructure.Repositories;

public class TaskRepository : ITaskRepository
{
    private readonly IMongoCollection<Task> _collection;

    public TaskRepository(MongoDbContext context)
    {
        _collection = context.GetCollection<Task>("tasks");
        
        // Create indexes
        var fieldIndex = Builders<Task>.IndexKeys.Ascending(t => t.FieldId);
        _collection.Indexes.CreateOne(new CreateIndexModel<Task>(fieldIndex));
        
        var assignedToIndex = Builders<Task>.IndexKeys.Ascending(t => t.AssignedTo);
        _collection.Indexes.CreateOne(new CreateIndexModel<Task>(assignedToIndex));
        
        var statusIndex = Builders<Task>.IndexKeys.Ascending(t => t.Status);
        _collection.Indexes.CreateOne(new CreateIndexModel<Task>(statusIndex));
        
        var scheduledStartIndex = Builders<Task>.IndexKeys.Ascending(t => t.ScheduledStart);
        _collection.Indexes.CreateOne(new CreateIndexModel<Task>(scheduledStartIndex));
    }

    public async Task<Task?> GetByIdAsync(string id)
    {
        return await _collection.Find(t => t.Id == id).FirstOrDefaultAsync();
    }

    public async Task<IEnumerable<Task>> GetByFieldIdAsync(string fieldId)
    {
        return await _collection.Find(t => t.FieldId == fieldId).ToListAsync();
    }

    public async Task<IEnumerable<Task>> GetByAssignedToAsync(string assignedTo)
    {
        return await _collection.Find(t => t.AssignedTo == assignedTo).ToListAsync();
    }

    public async Task<IEnumerable<Task>> GetByFieldIdAndStatusAsync(string fieldId, string status)
    {
        return await _collection.Find(t => t.FieldId == fieldId && t.Status == status).ToListAsync();
    }

    public async Task<Task> CreateAsync(Task task)
    {
        await _collection.InsertOneAsync(task);
        return task;
    }

    public async Task<Task> UpdateAsync(Task task)
    {
        task.UpdatedAt = DateTime.UtcNow;
        await _collection.ReplaceOneAsync(t => t.Id == task.Id, task);
        return task;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _collection.DeleteOneAsync(t => t.Id == id);
        return result.DeletedCount > 0;
    }
}
