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
    Task<ImportGreekCadastreFieldResponse> ImportGreekCadastreAsync(
        string ownerId,
        Stream kdFile,
        string kdFileName,
        Stream kfFile,
        string kfFileName,
        CancellationToken cancellationToken = default);
    Task<FieldDto> UpdateBoundaryAsync(string id, string userId, UpdateFieldBoundaryRequest request, CancellationToken cancellationToken = default);
    Task<FieldAreaValidationResponse> ValidateAreaAsync(string id, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<ActivateFieldResponse> ActivateFieldAsync(string id, string userId, string userRole, ActivateFieldRequest request, CancellationToken cancellationToken = default);
    Task<FieldDto> UploadDocumentAsync(
        string id,
        string userId,
        string userRole,
        Stream file,
        string fileName,
        string documentType,
        CancellationToken cancellationToken = default);
}
