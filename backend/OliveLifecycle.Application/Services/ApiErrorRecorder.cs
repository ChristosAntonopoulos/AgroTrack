using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Services;

public interface IApiErrorRecorder
{
    Task RecordUnhandledAsync(
        string method,
        string path,
        string? userId,
        string? requestId,
        Exception exception,
        CancellationToken cancellationToken = default);
}

public class ApiErrorRecorder : IApiErrorRecorder
{
    private const int MaxMessageLength = 2000;
    private const int MaxStackLength = 4000;

    private readonly IApiErrorEventRepository _errors;
    private readonly IDateTimeProvider _clock;
    private readonly ILogger<ApiErrorRecorder> _logger;

    public ApiErrorRecorder(
        IApiErrorEventRepository errors,
        IDateTimeProvider clock,
        ILogger<ApiErrorRecorder> logger)
    {
        _errors = errors;
        _clock = clock;
        _logger = logger;
    }

    public async Task RecordUnhandledAsync(
        string method,
        string path,
        string? userId,
        string? requestId,
        Exception exception,
        CancellationToken cancellationToken = default)
    {
        var sanitizedPath = SanitizePath(path);
        if (ShouldSkipPath(sanitizedPath))
        {
            return;
        }

        try
        {
            var now = _clock.UtcNow;
            await _errors.CreateAsync(new ApiErrorEvent
            {
                OccurredAt = now,
                Method = string.IsNullOrWhiteSpace(method) ? "UNKNOWN" : method.Trim().ToUpperInvariant(),
                Path = sanitizedPath,
                StatusCode = 500,
                ErrorCode = "internal_error",
                ExceptionType = exception.GetType().FullName ?? exception.GetType().Name,
                Message = Truncate(SanitizeMessage(exception.Message), MaxMessageLength),
                StackTrace = Truncate(exception.StackTrace, MaxStackLength),
                UserId = string.IsNullOrWhiteSpace(userId) ? null : userId,
                RequestId = string.IsNullOrWhiteSpace(requestId) ? null : requestId,
                CreatedAt = now,
                UpdatedAt = now
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist API error event for {Path}", sanitizedPath);
        }
    }

    public static bool ShouldSkipPath(string path) =>
        path.StartsWith("/health", StringComparison.OrdinalIgnoreCase)
        || path.StartsWith("/api/v1/admin/errors", StringComparison.OrdinalIgnoreCase);

    public static string SanitizePath(string? pathValue)
    {
        var path = string.IsNullOrWhiteSpace(pathValue) ? "/" : pathValue.Trim();
        var cut = path.IndexOfAny(['?', '#']);
        if (cut >= 0)
        {
            path = path[..cut];
        }

        return path.Length > 500 ? path[..500] : path;
    }

    private static string SanitizeMessage(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return "Unexpected error";
        }

        return message
            .Replace("password=", "password=***", StringComparison.OrdinalIgnoreCase)
            .Replace("pwd=", "pwd=***", StringComparison.OrdinalIgnoreCase);
    }

    private static string Truncate(string? value, int max)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        return value.Length <= max ? value : value[..max];
    }
}
