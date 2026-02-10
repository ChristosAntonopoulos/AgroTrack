using OliveLifecycle.Application.DTOs.Field;

namespace OliveLifecycle.Application.Services;

public interface IFieldService
{
    Task<FieldDto> CreateFieldAsync(string ownerId, CreateFieldDto createFieldDto);
    Task<FieldDto?> GetFieldByIdAsync(string id, string userId, string userRole);
    Task<IEnumerable<FieldDto>> GetFieldsByOwnerAsync(string ownerId);
    Task<IEnumerable<FieldDto>> GetFieldsForUserAsync(string userId, string userRole);
    Task<FieldDto> UpdateFieldAsync(string id, string userId, UpdateFieldDto updateFieldDto);
    Task<bool> DeleteFieldAsync(string id, string userId);
}
