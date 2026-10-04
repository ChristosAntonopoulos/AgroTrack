namespace OliveLifecycle.Core;

public static class FamilyModules
{
    public const string Fields = "fields";
    public const string Tasks = "tasks";
    public const string Photos = "photos";
    public const string Documents = "documents";
    public const string Money = "money";
    public const string Chronologio = "chronologio";
    public const string Harvest = "harvest";

    /// <summary>Legacy invite/storage key. <see cref="Normalize"/> maps it to <see cref="Chronologio"/>.</summary>
    public const string Calendar = "calendar";

    public static readonly string[] All =
    [
        Fields, Tasks, Photos, Documents, Money, Chronologio, Harvest
    ];

    public static readonly string[] DefaultOnInvite =
    [
        Fields, Tasks, Photos, Chronologio
    ];

    public static bool IsKnown(string module) =>
        All.Contains(Normalize(module), StringComparer.OrdinalIgnoreCase);

    public static string Normalize(string? module)
    {
        var normalized = (module ?? string.Empty).Trim().ToLowerInvariant();
        return string.Equals(normalized, Calendar, StringComparison.Ordinal)
            ? Chronologio
            : normalized;
    }
}
