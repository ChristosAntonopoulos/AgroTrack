namespace OliveLifecycle.Application.Abstractions.Services;

public interface ICurrentUserContext
{
    string UserId { get; }
    string Role { get; }
    bool IsAuthenticated { get; }
}
