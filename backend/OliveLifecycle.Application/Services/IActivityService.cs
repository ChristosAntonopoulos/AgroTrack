using OliveLifecycle.Application.DTOs.Activity;

namespace OliveLifecycle.Application.Services;

public interface IActivityService
{
    Task RecordAsync(
        string fieldId,
        string type,
        string message,
        string? actorUserId = null,
        string? taskId = null,
        Dictionary<string, string>? metadata = null,
        CancellationToken cancellationToken = default);

    Task<IEnumerable<ActivityDto>> GetByFieldIdAsync(string fieldId, int limit = 50, CancellationToken cancellationToken = default);
}
