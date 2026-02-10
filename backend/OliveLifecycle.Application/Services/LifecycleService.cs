using OliveLifecycle.Application.DTOs.Lifecycle;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Repositories;

namespace OliveLifecycle.Application.Services;

public class LifecycleService : ILifecycleService
{
    private readonly ILifecycleRepository _lifecycleRepository;
    private readonly IFieldRepository _fieldRepository;
    private readonly ILogger<LifecycleService> _logger;

    public LifecycleService(
        ILifecycleRepository lifecycleRepository,
        IFieldRepository fieldRepository,
        ILogger<LifecycleService> logger)
    {
        _lifecycleRepository = lifecycleRepository;
        _fieldRepository = fieldRepository;
        _logger = logger;
    }

    public async Task<LifecycleDto> InitializeLifecycleAsync(string fieldId)
    {
        var existing = await _lifecycleRepository.GetByFieldIdAsync(fieldId);
        if (existing != null)
        {
            return MapToDto(existing);
        }

        var field = await _fieldRepository.GetByIdAsync(fieldId);
        if (field == null)
        {
            throw new KeyNotFoundException("Field not found.");
        }

        var lifecycle = new Lifecycle
        {
            FieldId = fieldId,
            CurrentYear = "low",
            CycleStartDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await _lifecycleRepository.CreateAsync(lifecycle);
        
        // Update field's current lifecycle year
        field.CurrentLifecycleYear = "low";
        await _fieldRepository.UpdateAsync(field);

        _logger.LogInformation("Lifecycle initialized for field {FieldId}", fieldId);
        return MapToDto(created);
    }

    public async Task<LifecycleDto?> GetLifecycleByFieldIdAsync(string fieldId)
    {
        var lifecycle = await _lifecycleRepository.GetByFieldIdAsync(fieldId);
        return lifecycle != null ? MapToDto(lifecycle) : null;
    }

    public async Task<LifecycleDto> ProgressCycleAsync(string fieldId)
    {
        var lifecycle = await _lifecycleRepository.GetByFieldIdAsync(fieldId);
        if (lifecycle == null)
        {
            throw new KeyNotFoundException("Lifecycle not found for this field.");
        }

        // Check if it's time to progress (anniversary of cycle start)
        var now = DateTime.UtcNow;
        var cycleStart = lifecycle.CycleStartDate;
        var yearsSinceStart = (now.Year - cycleStart.Year) - (now.DayOfYear < cycleStart.DayOfYear ? 1 : 0);
        
        // Progress every year on the anniversary
        if (lifecycle.LastProgressionDate == null || 
            (now.Year > lifecycle.LastProgressionDate.Value.Year || 
             (now.Year == lifecycle.LastProgressionDate.Value.Year && now.DayOfYear >= cycleStart.DayOfYear)))
        {
            // Toggle between low and high
            lifecycle.CurrentYear = lifecycle.CurrentYear == "low" ? "high" : "low";
            lifecycle.LastProgressionDate = now;
            
            var updated = await _lifecycleRepository.UpdateAsync(lifecycle);
            
            // Update field's current lifecycle year
            var field = await _fieldRepository.GetByIdAsync(fieldId);
            if (field != null)
            {
                field.CurrentLifecycleYear = lifecycle.CurrentYear;
                await _fieldRepository.UpdateAsync(field);
            }

            _logger.LogInformation("Lifecycle progressed for field {FieldId} to {Year}", fieldId, lifecycle.CurrentYear);
            return MapToDto(updated);
        }

        return MapToDto(lifecycle);
    }

    public async Task<bool> ValidateTaskForLifecycleAsync(string fieldId, string lifecycleYear)
    {
        var lifecycle = await _lifecycleRepository.GetByFieldIdAsync(fieldId);
        if (lifecycle == null)
        {
            return false;
        }

        return lifecycle.CurrentYear == lifecycleYear;
    }

    private static LifecycleDto MapToDto(Lifecycle lifecycle)
    {
        return new LifecycleDto
        {
            Id = lifecycle.Id,
            FieldId = lifecycle.FieldId,
            CurrentYear = lifecycle.CurrentYear,
            CycleStartDate = lifecycle.CycleStartDate,
            LastProgressionDate = lifecycle.LastProgressionDate,
            CreatedAt = lifecycle.CreatedAt,
            UpdatedAt = lifecycle.UpdatedAt
        };
    }
}
