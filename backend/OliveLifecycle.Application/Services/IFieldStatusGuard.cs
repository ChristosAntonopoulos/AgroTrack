namespace OliveLifecycle.Application.Services;

/// <summary>
/// Blocks new normal records on archived (or otherwise non-writable) fields.
/// </summary>
public interface IFieldStatusGuard
{
    /// <summary>
    /// Throws when the field cannot accept new harvest, money, task, observation, note, or photo records.
    /// </summary>
    Task EnsureAcceptsNewRecordsAsync(string fieldId, CancellationToken cancellationToken = default);
}
