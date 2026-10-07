using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class ApiErrorEventMapper
{
    public static ApiErrorEvent ToEntity(ApiErrorEventDocument document) => new()
    {
        Id = document.Id,
        OccurredAt = document.OccurredAt,
        Method = document.Method,
        Path = document.Path,
        StatusCode = document.StatusCode,
        ErrorCode = document.ErrorCode,
        ExceptionType = document.ExceptionType,
        Message = document.Message,
        StackTrace = document.StackTrace,
        UserId = document.UserId,
        RequestId = document.RequestId,
        AcknowledgedAt = document.AcknowledgedAt,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static ApiErrorEventDocument ToDocument(ApiErrorEvent entity) => new()
    {
        Id = entity.Id,
        OccurredAt = entity.OccurredAt,
        Method = entity.Method,
        Path = entity.Path,
        StatusCode = entity.StatusCode,
        ErrorCode = entity.ErrorCode,
        ExceptionType = entity.ExceptionType,
        Message = entity.Message,
        StackTrace = entity.StackTrace,
        UserId = entity.UserId,
        RequestId = entity.RequestId,
        AcknowledgedAt = entity.AcknowledgedAt,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
