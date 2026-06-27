namespace OliveLifecycle.Common.Api;

public class ApiError
{
    public string Message { get; set; } = string.Empty;
    public string? Code { get; set; }
    public IDictionary<string, string[]>? Errors { get; set; }
}
