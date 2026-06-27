using OliveLifecycle.Application.DTOs.Task;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Mappings;

public static class TaskMapper
{
    public static TaskDto ToDto(TaskItem task) => new()
    {
        Id = task.Id,
        FieldId = task.FieldId,
        TemplateId = task.TemplateId,
        Type = task.Type,
        Title = task.Title,
        Description = task.Description,
        LifecycleYear = task.LifecycleYear,
        AssignedTo = task.AssignedTo,
        Status = task.Status.ToApiString(),
        ScheduledStart = task.ScheduledStart,
        ScheduledEnd = task.ScheduledEnd,
        ActualStart = task.ActualStart,
        ActualEnd = task.ActualEnd,
        Cost = task.Cost,
        ApprovalStatus = task.ApprovalStatus.ToApiString(),
        ApprovalNote = task.ApprovalNote,
        Evidence = task.Evidence.Select(e => new EvidenceDto
        {
            PhotoUrl = e.PhotoUrl,
            Notes = e.Notes,
            Kind = e.Kind,
            Timestamp = e.Timestamp
        }).ToList(),
        Notes = task.Notes,
        CreatedAt = task.CreatedAt,
        UpdatedAt = task.UpdatedAt
    };
}
