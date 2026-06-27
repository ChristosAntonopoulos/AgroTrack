using System.Net;
using System.Text.Json;
using OliveLifecycle.Common.Api;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, error) = exception switch
        {
            NotFoundException notFound => (HttpStatusCode.NotFound, new ApiError { Message = notFound.Message, Code = "not_found" }),
            ForbiddenException forbidden => (HttpStatusCode.Forbidden, new ApiError { Message = forbidden.Message, Code = "forbidden" }),
            ConflictException conflict => (HttpStatusCode.Conflict, new ApiError { Message = conflict.Message, Code = "conflict" }),
            ValidationException validation => (HttpStatusCode.BadRequest, new ApiError
            {
                Message = validation.Message,
                Code = "validation_error",
                Errors = validation.Errors.Count > 0 ? validation.Errors : null
            }),
            UnauthorizedAccessException unauthorized => (HttpStatusCode.Forbidden, new ApiError { Message = unauthorized.Message, Code = "forbidden" }),
            InvalidOperationException invalid => (HttpStatusCode.BadRequest, new ApiError { Message = invalid.Message, Code = "invalid_operation" }),
            _ => (HttpStatusCode.InternalServerError, new ApiError { Message = "An unexpected error occurred.", Code = "internal_error" })
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var payload = JsonSerializer.Serialize(new ApiResponse<object>
        {
            Success = false,
            Error = error
        });

        await context.Response.WriteAsync(payload);
    }
}
