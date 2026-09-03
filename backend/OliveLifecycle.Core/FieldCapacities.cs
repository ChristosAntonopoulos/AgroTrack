namespace OliveLifecycle.Core;

public static class FieldCapacities
{
    public const string Own = "own";
    public const string Work = "work";
    public const string Advise = "advise";
    public const string Help = "help";
    public const string View = "view";

    public static readonly string[] All = [Own, Work, Advise, Help, View];

    public static bool IsKnown(string capacity) =>
        All.Contains(capacity, StringComparer.OrdinalIgnoreCase);

    public static string Normalize(string capacity) => capacity.Trim().ToLowerInvariant();
}
