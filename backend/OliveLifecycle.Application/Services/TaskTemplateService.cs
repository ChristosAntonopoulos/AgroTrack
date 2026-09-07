using OliveLifecycle.Application.DTOs.TaskTemplate;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Services;

public interface ITaskTemplateService
{
    Task<IEnumerable<TaskTemplateDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TaskTemplateDto?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
}

public class TaskTemplateService : ITaskTemplateService
{
    private readonly ITaskTemplateRepository _repository;

    public TaskTemplateService(ITaskTemplateRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<TaskTemplateDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var templates = await _repository.GetAllAsync(cancellationToken);
        return templates.Select(MapToDto);
    }

    public async Task<TaskTemplateDto?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var template = await _repository.GetByIdAsync(id, cancellationToken);
        return template == null ? null : MapToDto(template);
    }

    private static TaskTemplateDto MapToDto(TaskTemplate template) => new()
    {
        Id = template.Id,
        Type = template.Type,
        Title = template.Title,
        Description = template.Description,
        LifecycleYear = template.LifecycleYear,
        HarvestPhase = template.HarvestPhase?.ToApiString()
            ?? HarvestPhaseCatalog.FromTypeOrTitle(template.Type, template.Title)?.ToApiString(),
        DefaultSchedulingWindow = template.DefaultSchedulingWindow == null
            ? null
            : new SchedulingWindowDto
            {
                StartMonth = template.DefaultSchedulingWindow.StartMonth,
                StartDay = template.DefaultSchedulingWindow.StartDay,
                EndMonth = template.DefaultSchedulingWindow.EndMonth,
                EndDay = template.DefaultSchedulingWindow.EndDay
            }
    };
}
