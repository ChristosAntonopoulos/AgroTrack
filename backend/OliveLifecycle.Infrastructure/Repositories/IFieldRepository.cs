using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Infrastructure.Repositories;

public interface IFieldRepository
{
    Task<Field?> GetByIdAsync(string id);
    Task<IEnumerable<Field>> GetByOwnerIdAsync(string ownerId);
    Task<IEnumerable<Field>> GetByIdsAsync(IEnumerable<string> fieldIds);
    Task<Field> CreateAsync(Field field);
    Task<Field> UpdateAsync(Field field);
    Task<bool> DeleteAsync(string id);
    Task<bool> ExistsAsync(string id);
}
