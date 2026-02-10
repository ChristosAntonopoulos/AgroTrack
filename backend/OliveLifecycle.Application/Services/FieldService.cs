using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Repositories;

namespace OliveLifecycle.Application.Services;

public class FieldService : IFieldService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly ILogger<FieldService> _logger;

    public FieldService(IFieldRepository fieldRepository, ITaskRepository taskRepository, ILogger<FieldService> logger)
    {
        _fieldRepository = fieldRepository;
        _taskRepository = taskRepository;
        _logger = logger;
    }

    public async Task<FieldDto> CreateFieldAsync(string ownerId, CreateFieldDto createFieldDto)
    {
        var field = new Field
        {
            OwnerId = ownerId,
            Name = createFieldDto.Name,
            Area = createFieldDto.Area,
            Variety = createFieldDto.Variety,
            TreeAge = createFieldDto.TreeAge,
            GroundType = createFieldDto.GroundType,
            IrrigationStatus = createFieldDto.IrrigationStatus,
            CurrentLifecycleYear = "low",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (createFieldDto.Latitude.HasValue && createFieldDto.Longitude.HasValue)
        {
            field.Location = new Location
            {
                Latitude = createFieldDto.Latitude.Value,
                Longitude = createFieldDto.Longitude.Value
            };
        }

        var createdField = await _fieldRepository.CreateAsync(field);
        return MapToDto(createdField);
    }

    public async Task<FieldDto?> GetFieldByIdAsync(string id, string userId, string userRole)
    {
        var field = await _fieldRepository.GetByIdAsync(id);
        if (field == null)
        {
            return null;
        }

        // Check if user has access to this field
        bool hasAccess = false;
        
        // Owner always has access
        if (field.OwnerId == userId)
        {
            hasAccess = true;
        }
        // Producers have access if they have tasks assigned in this field
        else if (userRole == "Producer")
        {
            var tasks = await _taskRepository.GetByAssignedToAsync(userId);
            hasAccess = tasks.Any(t => t.FieldId == id);
        }

        if (!hasAccess)
        {
            throw new UnauthorizedAccessException("You do not have access to this field.");
        }

        return MapToDto(field);
    }

    public async Task<IEnumerable<FieldDto>> GetFieldsByOwnerAsync(string ownerId)
    {
        var fields = await _fieldRepository.GetByOwnerIdAsync(ownerId);
        return fields.Select(MapToDto);
    }

    public async Task<IEnumerable<FieldDto>> GetFieldsForUserAsync(string userId, string userRole)
    {
        var fields = new List<Field>();

        // FieldOwners get their owned fields
        if (userRole == "FieldOwner" || userRole == "Administrator")
        {
            var ownedFields = await _fieldRepository.GetByOwnerIdAsync(userId);
            fields.AddRange(ownedFields);
        }
        // Producers get fields where they have assigned tasks
        else if (userRole == "Producer")
        {
            // Get all tasks assigned to this user
            var tasks = await _taskRepository.GetByAssignedToAsync(userId);
            
            // Get unique field IDs from tasks
            var fieldIds = tasks.Select(t => t.FieldId).Distinct().ToList();
            
            if (fieldIds.Any())
            {
                // Get fields by IDs
                var assignedFields = await _fieldRepository.GetByIdsAsync(fieldIds);
                fields.AddRange(assignedFields);
            }
        }
        // Agronomists can see all fields (for now, same as FieldOwner)
        else if (userRole == "Agronomist")
        {
            var ownedFields = await _fieldRepository.GetByOwnerIdAsync(userId);
            fields.AddRange(ownedFields);
        }

        // Remove duplicates and return
        return fields.DistinctBy(f => f.Id).Select(MapToDto);
    }

    public async Task<FieldDto> UpdateFieldAsync(string id, string userId, UpdateFieldDto updateFieldDto)
    {
        var field = await _fieldRepository.GetByIdAsync(id);
        if (field == null)
        {
            throw new KeyNotFoundException("Field not found.");
        }

        if (field.OwnerId != userId)
        {
            throw new UnauthorizedAccessException("You do not have permission to update this field.");
        }

        if (!string.IsNullOrEmpty(updateFieldDto.Name))
        {
            field.Name = updateFieldDto.Name;
        }

        if (updateFieldDto.Area.HasValue)
        {
            field.Area = updateFieldDto.Area.Value;
        }

        if (updateFieldDto.Variety != null)
        {
            field.Variety = updateFieldDto.Variety;
        }

        if (updateFieldDto.TreeAge.HasValue)
        {
            field.TreeAge = updateFieldDto.TreeAge;
        }

        if (updateFieldDto.GroundType != null)
        {
            field.GroundType = updateFieldDto.GroundType;
        }

        if (updateFieldDto.IrrigationStatus.HasValue)
        {
            field.IrrigationStatus = updateFieldDto.IrrigationStatus.Value;
        }

        if (updateFieldDto.Latitude.HasValue && updateFieldDto.Longitude.HasValue)
        {
            field.Location = new Location
            {
                Latitude = updateFieldDto.Latitude.Value,
                Longitude = updateFieldDto.Longitude.Value
            };
        }

        var updatedField = await _fieldRepository.UpdateAsync(field);
        return MapToDto(updatedField);
    }

    public async Task<bool> DeleteFieldAsync(string id, string userId)
    {
        var field = await _fieldRepository.GetByIdAsync(id);
        if (field == null)
        {
            return false;
        }

        if (field.OwnerId != userId)
        {
            throw new UnauthorizedAccessException("You do not have permission to delete this field.");
        }

        return await _fieldRepository.DeleteAsync(id);
    }

    private static FieldDto MapToDto(Field field)
    {
        return new FieldDto
        {
            Id = field.Id,
            OwnerId = field.OwnerId,
            Name = field.Name,
            Latitude = field.Location?.Latitude,
            Longitude = field.Location?.Longitude,
            Area = field.Area,
            Variety = field.Variety,
            TreeAge = field.TreeAge,
            GroundType = field.GroundType,
            IrrigationStatus = field.IrrigationStatus,
            CurrentLifecycleYear = field.CurrentLifecycleYear,
            CreatedAt = field.CreatedAt,
            UpdatedAt = field.UpdatedAt
        };
    }
}
