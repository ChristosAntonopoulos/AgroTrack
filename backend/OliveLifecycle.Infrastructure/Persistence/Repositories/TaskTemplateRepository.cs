using MongoDB.Driver;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Mappers;

namespace OliveLifecycle.Infrastructure.Persistence.Repositories;

public class TaskTemplateRepository : MongoRepositoryBase<TaskTemplateDocument, TaskTemplate>, ITaskTemplateRepository
{
    public TaskTemplateRepository(MongoDbContext context) : base(context, "task_templates")
    {
    }

    protected override TaskTemplateDocument ToDocument(TaskTemplate entity) => TaskTemplateMapper.ToDocument(entity);
    protected override TaskTemplate ToEntity(TaskTemplateDocument document) => TaskTemplateMapper.ToEntity(document);
    protected override FilterDefinition<TaskTemplateDocument> BuildIdFilter(string id) =>
        Builders<TaskTemplateDocument>.Filter.Eq(t => t.Id, id);

    public async Task<IEnumerable<TaskTemplate>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var documents = await Collection.Find(_ => true).ToListAsync(cancellationToken);
        return documents.Select(ToEntity);
    }

    public async Task<TaskTemplate?> GetByTypeAsync(string type, CancellationToken cancellationToken = default)
    {
        var document = await Collection.Find(t => t.Type == type).FirstOrDefaultAsync(cancellationToken);
        return document == null ? null : ToEntity(document);
    }
}
