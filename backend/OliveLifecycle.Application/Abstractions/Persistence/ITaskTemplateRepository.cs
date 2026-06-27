using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface ITaskTemplateRepository : IRepository<TaskTemplate, string>
{
    Task<IEnumerable<TaskTemplate>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TaskTemplate?> GetByTypeAsync(string type, CancellationToken cancellationToken = default);
}
