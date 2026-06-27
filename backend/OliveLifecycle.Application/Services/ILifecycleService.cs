using OliveLifecycle.Application.DTOs.Lifecycle;

namespace OliveLifecycle.Application.Services;

public interface ILifecycleService
{
    Task<LifecycleDto> InitializeLifecycleAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<LifecycleDto?> GetLifecycleByFieldIdAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<LifecycleDto> ProgressCycleAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<LifecycleDto> AdvanceStageAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<LifecycleDto> RevertStageAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task<bool> ValidateTaskForLifecycleAsync(string fieldId, string lifecycleYear, CancellationToken cancellationToken = default);
}
