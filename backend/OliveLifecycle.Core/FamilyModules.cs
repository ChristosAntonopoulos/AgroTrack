namespace OliveLifecycle.Core;

public static class FamilyModules
{
    public const string Fields = "fields";
    public const string Tasks = "tasks";
    public const string Documents = "documents";
    public const string Money = "money";
    public const string Calendar = "calendar";
    public const string Harvest = "harvest";

    public static readonly string[] All =
    [
        Fields, Tasks, Documents, Money, Calendar, Harvest
    ];

    public static readonly string[] DefaultOnInvite =
    [
        Fields, Tasks, Calendar
    ];

    public static bool IsKnown(string module) =>
        All.Contains(module, StringComparer.OrdinalIgnoreCase);

    public static string Normalize(string module) => module.Trim().ToLowerInvariant();
}
