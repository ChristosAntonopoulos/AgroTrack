using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class TaskMapper
{
    public static TaskItem ToEntity(TaskDocument document) => new()
    {
        Id = document.Id,
        FieldId = document.FieldId,
        TemplateId = document.TemplateId,
        Type = document.Type,
        Title = document.Title,
        Description = document.Description,
        LifecycleYear = document.LifecycleYear,
        HarvestPhase = HarvestPhaseExtensions.FromApiString(document.HarvestPhase)
            ?? HarvestPhaseCatalog.FromTypeOrTitle(document.Type, document.Title),
        AssignedTo = document.AssignedTo,
        Status = WorkTaskStatusExtensions.FromApiString(document.Status),
        ScheduledStart = document.ScheduledStart,
        ScheduledEnd = document.ScheduledEnd,
        ActualStart = document.ActualStart,
        ActualEnd = document.ActualEnd,
        Cost = document.Cost,
        ApprovalStatus = ApprovalStatusExtensions.FromApiString(document.ApprovalStatus),
        ApprovalNote = document.ApprovalNote,
        Evidence = document.Evidence.Select(e => new Evidence
        {
            PhotoUrl = e.PhotoUrl,
            Notes = e.Notes,
            Kind = e.Kind,
            Timestamp = e.Timestamp
        }).ToList(),
        Notes = document.Notes,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static TaskDocument ToDocument(TaskItem entity) => new()
    {
        Id = entity.Id,
        FieldId = entity.FieldId,
        TemplateId = entity.TemplateId,
        Type = entity.Type,
        Title = entity.Title,
        Description = entity.Description,
        LifecycleYear = entity.LifecycleYear,
        HarvestPhase = entity.HarvestPhase?.ToApiString(),
        AssignedTo = entity.AssignedTo,
        Status = entity.Status.ToApiString(),
        ScheduledStart = entity.ScheduledStart,
        ScheduledEnd = entity.ScheduledEnd,
        ActualStart = entity.ActualStart,
        ActualEnd = entity.ActualEnd,
        Cost = entity.Cost,
        ApprovalStatus = entity.ApprovalStatus.ToApiString(),
        ApprovalNote = entity.ApprovalNote,
        Evidence = entity.Evidence.Select(e => new EvidenceDocument
        {
            PhotoUrl = e.PhotoUrl,
            Notes = e.Notes,
            Kind = e.Kind,
            Timestamp = e.Timestamp
        }).ToList(),
        Notes = entity.Notes,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
