namespace OliveLifecycle.Core.Enums;

public enum MediaOwnerType
{
    Note,
    Task,
    Harvest
}

public static class MediaOwnerTypeExtensions
{
    public static string ToApiString(this MediaOwnerType ownerType) => ownerType switch
    {
        MediaOwnerType.Note => "note",
        MediaOwnerType.Task => "task",
        MediaOwnerType.Harvest => "harvest",
        _ => "note"
    };

    public static MediaOwnerType? FromApiString(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim().ToLowerInvariant() switch
            {
                "note" => MediaOwnerType.Note,
                "task" => MediaOwnerType.Task,
                "harvest" => MediaOwnerType.Harvest,
                _ => null
            };
}
