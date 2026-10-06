namespace OliveLifecycle.Application.Services;

public interface IFieldDeletionGuard
{
    /// <summary>
    /// True when the field has any history that must stay linked (blocks permanent delete).
    /// </summary>
    Task<bool> HasLinkedRecordsAsync(string fieldId, string ownerId, CancellationToken cancellationToken = default);

    Task<FieldLinkSummary> InspectAsync(string fieldId, string ownerId, CancellationToken cancellationToken = default);
}

public sealed class FieldLinkSummary
{
    public bool HasChronologioOrActivity { get; init; }
    public bool HasMoney { get; init; }
    public bool HasHarvest { get; init; }
    public bool HasOilProvenance { get; init; }
    public bool HasPhotosOrDocuments { get; init; }
    public bool HasCollaborators { get; init; }
    public bool HasTasksOrWork { get; init; }
    public bool HasNotes { get; init; }
    public bool HasLifecycle { get; init; }

    public bool HasAny =>
        HasChronologioOrActivity
        || HasMoney
        || HasHarvest
        || HasOilProvenance
        || HasPhotosOrDocuments
        || HasCollaborators
        || HasTasksOrWork
        || HasNotes
        || HasLifecycle;
}
