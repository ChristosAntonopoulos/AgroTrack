using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class TaskRepository : MongoRepositoryBase<TaskDocument, TaskItem>, ITaskRepository
{
    public TaskRepository(MongoDbContext context) : base(context, "tasks")
    {
    }

    protected override TaskDocument ToDocument(TaskItem entity) => TaskMapper.ToDocument(entity);
    protected override TaskItem ToEntity(TaskDocument document) => TaskMapper.ToEntity(document);
    protected override FilterDefinition<TaskDocument> BuildIdFilter(string id) =>
        Builders<TaskDocument>.Filter.Eq(t => t.Id, id);

    public async Task<IEnumerable<TaskItem>> GetByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var documents = await Collection.Find(t => t.FieldId == fieldId).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    public async Task<IEnumerable<TaskItem>> GetByFieldIdsAsync(IEnumerable<string> fieldIds, CancellationToken cancellationToken = default)
    {
        var ids = fieldIds.ToList();
        if (ids.Count == 0)
        {
            return Enumerable.Empty<TaskItem>();
        }

        var filter = Builders<TaskDocument>.Filter.In(t => t.FieldId, ids);
        var documents = await Collection.Find(filter).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    public async Task<IEnumerable<TaskItem>> GetByAssignedToAsync(string assignedTo, CancellationToken cancellationToken = default)
    {
        var documents = await Collection.Find(t => t.AssignedTo == assignedTo).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    public async Task<IEnumerable<TaskItem>> GetByFieldIdAndStatusAsync(string fieldId, string status, CancellationToken cancellationToken = default)
    {
        var documents = await Collection.Find(t => t.FieldId == fieldId && t.Status == status).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }
}
