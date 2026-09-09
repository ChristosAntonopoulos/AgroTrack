using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class TaskTemplateMapper
{
    public static TaskTemplate ToEntity(TaskTemplateDocument document) => new()
    {
        Id = document.Id,
        Type = document.Type,
        Title = document.Title,
        Description = document.Description,
        LifecycleYear = document.LifecycleYear,
        HarvestPhase = HarvestPhaseExtensions.FromApiString(document.HarvestPhase)
            ?? HarvestPhaseCatalog.FromTypeOrTitle(document.Type, document.Title),
        DefaultSchedulingWindow = document.DefaultSchedulingWindow == null
            ? null
            : new SchedulingWindow
            {
                StartMonth = document.DefaultSchedulingWindow.StartMonth,
                StartDay = document.DefaultSchedulingWindow.StartDay,
                EndMonth = document.DefaultSchedulingWindow.EndMonth,
                EndDay = document.DefaultSchedulingWindow.EndDay
            },
        ServiceCategorySlug = document.ServiceCategorySlug,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static TaskTemplateDocument ToDocument(TaskTemplate entity) => new()
    {
        Id = entity.Id,
        Type = entity.Type,
        Title = entity.Title,
        Description = entity.Description,
        LifecycleYear = entity.LifecycleYear,
        HarvestPhase = entity.HarvestPhase?.ToApiString(),
        DefaultSchedulingWindow = entity.DefaultSchedulingWindow == null
            ? null
            : new SchedulingWindowDocument
            {
                StartMonth = entity.DefaultSchedulingWindow.StartMonth,
                StartDay = entity.DefaultSchedulingWindow.StartDay,
                EndMonth = entity.DefaultSchedulingWindow.EndMonth,
                EndDay = entity.DefaultSchedulingWindow.EndDay
            },
        ServiceCategorySlug = entity.ServiceCategorySlug,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
