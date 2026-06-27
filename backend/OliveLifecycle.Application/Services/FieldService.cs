using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using FieldEntity = OliveLifecycle.Core.Entities.Field;

namespace OliveLifecycle.Application.Services;

public class FieldService : IFieldService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IUserRepository _userRepository;
    private readonly IFieldAccessService _fieldAccessService;
    private readonly IActivityService _activityService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ILogger<FieldService> _logger;

    public FieldService(
        IFieldRepository fieldRepository,
        ITaskRepository taskRepository,
        IUserRepository userRepository,
        IFieldAccessService fieldAccessService,
        IActivityService activityService,
        IDateTimeProvider dateTimeProvider,
        ILogger<FieldService> logger)
    {
        _fieldRepository = fieldRepository;
        _taskRepository = taskRepository;
        _userRepository = userRepository;
        _fieldAccessService = fieldAccessService;
        _activityService = activityService;
        _dateTimeProvider = dateTimeProvider;
        _logger = logger;
    }

    public async Task<FieldDto> CreateFieldAsync(string ownerId, CreateFieldDto createFieldDto, CancellationToken cancellationToken = default)
    {
        var now = _dateTimeProvider.UtcNow;
        var field = new FieldEntity
        {
            OwnerId = ownerId,
            Name = createFieldDto.Name,
            Area = createFieldDto.Area,
            Variety = createFieldDto.Variety,
            TreeAge = createFieldDto.TreeAge,
            GroundType = createFieldDto.GroundType,
            IrrigationStatus = createFieldDto.IrrigationStatus,
            CurrentLifecycleYear = "low",
            CurrentLifecycleStage = OliveLifecycleStage.Dormancy,
            CreatedAt = now,
            UpdatedAt = now
        };

        if (createFieldDto.Latitude.HasValue && createFieldDto.Longitude.HasValue)
        {
            field.Location = new Location
            {
                Latitude = createFieldDto.Latitude.Value,
                Longitude = createFieldDto.Longitude.Value
            };
        }

        var createdField = await _fieldRepository.CreateAsync(field, cancellationToken);
        return FieldMapper.ToDto(createdField);
    }

    public async Task<FieldDto?> GetFieldByIdAsync(string id, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(id, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var field = await _fieldRepository.GetByIdAsync(id, cancellationToken);
        return field == null ? null : FieldMapper.ToDto(field);
    }

    public async Task<IEnumerable<FieldDto>> GetFieldsByOwnerAsync(string ownerId, CancellationToken cancellationToken = default)
    {
        var fields = await _fieldRepository.GetByOwnerIdAsync(ownerId, cancellationToken);
        return fields.Select(FieldMapper.ToDto);
    }

    public async Task<IEnumerable<FieldDto>> GetFieldsForUserAsync(string userId, string userRole, CancellationToken cancellationToken = default)
    {
        var fields = new List<FieldEntity>();

        if (userRole == Roles.FieldOwner || userRole == Roles.Administrator)
        {
            fields.AddRange(await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken));
        }
        else if (userRole == Roles.Producer)
        {
            fields.AddRange(await _fieldRepository.GetByAssignedProducerIdAsync(userId, cancellationToken));

            var tasks = await _taskRepository.GetByAssignedToAsync(userId, cancellationToken);
            var fieldIds = tasks.Select(t => t.FieldId).Distinct().ToList();
            if (fieldIds.Count > 0)
            {
                fields.AddRange(await _fieldRepository.GetByIdsAsync(fieldIds, cancellationToken));
            }
        }
        else if (userRole == Roles.Agronomist)
        {
            fields.AddRange(await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken));
        }

        return fields.DistinctBy(f => f.Id).Select(FieldMapper.ToDto);
    }

    public async Task<FieldDto> UpdateFieldAsync(string id, string userId, UpdateFieldDto updateFieldDto, CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (field.OwnerId != userId)
        {
            throw new ForbiddenException("You do not have permission to update this field.");
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

        var updatedField = await _fieldRepository.UpdateAsync(field, cancellationToken);
        return FieldMapper.ToDto(updatedField);
    }

    public async Task<bool> DeleteFieldAsync(string id, string userId, CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(id, cancellationToken);
        if (field == null)
        {
            return false;
        }

        if (field.OwnerId != userId)
        {
            throw new ForbiddenException("You do not have permission to delete this field.");
        }

        return await _fieldRepository.DeleteAsync(id, cancellationToken);
    }

    public async Task AssignProducerAsync(string fieldId, string ownerId, string producerId, CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (field.OwnerId != ownerId)
        {
            throw new ForbiddenException("You do not have permission to assign producers to this field.");
        }

        var producer = await _userRepository.GetByIdAsync(producerId, cancellationToken);
        if (producer == null || producer.Role != UserRole.Producer)
        {
            throw new ValidationException("User is not a valid producer.");
        }

        if (!field.AssignedProducerIds.Contains(producerId))
        {
            field.AssignedProducerIds.Add(producerId);
            await _fieldRepository.UpdateAsync(field, cancellationToken);
            await _activityService.RecordAsync(
                fieldId,
                "producer_assigned",
                "Producer assigned to field",
                ownerId,
                metadata: new Dictionary<string, string> { ["producerId"] = producerId },
                cancellationToken: cancellationToken);
            _logger.LogInformation("Producer {ProducerId} assigned to field {FieldId}", producerId, fieldId);
        }
    }

    public async Task UnassignProducerAsync(string fieldId, string ownerId, string producerId, CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (field.OwnerId != ownerId)
        {
            throw new ForbiddenException("You do not have permission to unassign producers from this field.");
        }

        if (field.AssignedProducerIds.Remove(producerId))
        {
            await _fieldRepository.UpdateAsync(field, cancellationToken);
            await _activityService.RecordAsync(
                fieldId,
                "producer_unassigned",
                "Producer removed from field",
                ownerId,
                metadata: new Dictionary<string, string> { ["producerId"] = producerId },
                cancellationToken: cancellationToken);
            _logger.LogInformation("Producer {ProducerId} unassigned from field {FieldId}", producerId, fieldId);
        }
    }

    public async Task<IEnumerable<string>> GetAssignedProducerIdsAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserModifyFieldAsync(fieldId, userId, cancellationToken) && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to view producer assignments.");
        }

        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        return field.AssignedProducerIds;
    }
}
