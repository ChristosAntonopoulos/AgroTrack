using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Activity;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Services;

public class ActivityService : IActivityService
{
    private readonly IActivityRepository _activityRepository;
    private readonly IDateTimeProvider _dateTimeProvider;

    public ActivityService(IActivityRepository activityRepository, IDateTimeProvider dateTimeProvider)
    {
        _activityRepository = activityRepository;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task RecordAsync(
        string fieldId,
        string type,
        string message,
        string? actorUserId = null,
        string? taskId = null,
        Dictionary<string, string>? metadata = null,
        CancellationToken cancellationToken = default)
    {
        var now = _dateTimeProvider.UtcNow;
        var activity = new Activity
        {
            FieldId = fieldId,
            Type = type,
            Message = message,
            ActorUserId = actorUserId,
            TaskId = taskId,
            Timestamp = now,
            Metadata = metadata,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _activityRepository.CreateAsync(activity, cancellationToken);
    }

    public async Task<IEnumerable<ActivityDto>> GetByFieldIdAsync(string fieldId, int limit = 50, CancellationToken cancellationToken = default)
    {
        var activities = await _activityRepository.GetByFieldIdAsync(fieldId, limit, cancellationToken);
        return activities.Select(ActivityMapper.ToDto);
    }
}
