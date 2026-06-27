using OliveLifecycle.Application.DTOs.Field;

namespace OliveLifecycle.Application.Services;

public interface IFieldService
{
    Task<FieldDto> CreateFieldAsync(string ownerId, CreateFieldDto createFieldDto, CancellationToken cancellationToken = default);
    Task<FieldDto?> GetFieldByIdAsync(string id, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<IEnumerable<FieldDto>> GetFieldsByOwnerAsync(string ownerId, CancellationToken cancellationToken = default);
    Task<IEnumerable<FieldDto>> GetFieldsForUserAsync(string userId, string userRole, CancellationToken cancellationToken = default);
    Task<FieldDto> UpdateFieldAsync(string id, string userId, UpdateFieldDto updateFieldDto, CancellationToken cancellationToken = default);
    Task<bool> DeleteFieldAsync(string id, string userId, CancellationToken cancellationToken = default);
    Task AssignProducerAsync(string fieldId, string ownerId, string producerId, CancellationToken cancellationToken = default);
    Task UnassignProducerAsync(string fieldId, string ownerId, string producerId, CancellationToken cancellationToken = default);
    Task<IEnumerable<string>> GetAssignedProducerIdsAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
}
