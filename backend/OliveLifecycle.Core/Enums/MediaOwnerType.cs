namespace OliveLifecycle.Core.Enums;

public enum MediaOwnerType
{
    /// <summary>Standalone Photo Hub photo owned by a field (not linked to a record).</summary>
    Field,
    Note,
    Task,
    Harvest,
    Phenology
}

public static class MediaOwnerTypeExtensions
{
    public static string ToApiString(this MediaOwnerType ownerType) => ownerType switch
    {
        MediaOwnerType.Field => "field",
        MediaOwnerType.Note => "note",
        MediaOwnerType.Task => "task",
        MediaOwnerType.Harvest => "harvest",
        MediaOwnerType.Phenology => "phenology",
        _ => "field"
    };

    public static MediaOwnerType? FromApiString(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim().ToLowerInvariant() switch
            {
                "field" => MediaOwnerType.Field,
                "note" => MediaOwnerType.Note,
                "task" => MediaOwnerType.Task,
                "harvest" => MediaOwnerType.Harvest,
                "phenology" => MediaOwnerType.Phenology,
                _ => null
            };

    public static bool IsLinkedRecord(this MediaOwnerType ownerType) =>
        ownerType is MediaOwnerType.Note
            or MediaOwnerType.Task
            or MediaOwnerType.Harvest
            or MediaOwnerType.Phenology;
}
