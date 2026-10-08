using OliveLifecycle.Core.Security;

namespace OliveLifecycle.Application.Services;

/// <summary>Runs the shared complexity policy (length + upper/lower/digit).</summary>
public static class PasswordGuard
{
    public static Task EnsureAsync(string? password, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        PasswordPolicy.EnsureAcceptable(password);
        return Task.CompletedTask;
    }
}
