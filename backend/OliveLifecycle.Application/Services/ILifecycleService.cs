using OliveLifecycle.Application.DTOs.Lifecycle;

namespace OliveLifecycle.Application.Services;

public interface ILifecycleService
{
    Task<LifecycleDto> InitializeLifecycleAsync(string fieldId);
    Task<LifecycleDto?> GetLifecycleByFieldIdAsync(string fieldId);
    Task<LifecycleDto> ProgressCycleAsync(string fieldId);
    Task<bool> ValidateTaskForLifecycleAsync(string fieldId, string lifecycleYear);
}
