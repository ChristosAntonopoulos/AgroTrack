namespace OliveLifecycle.Core;

public static class FamilyAccessLevels
{
    public const string View = "view";
    public const string Help = "help";
    public const string Work = "work";

    public static readonly string[] All = [View, Help, Work];

    public static bool IsKnown(string level) =>
        All.Contains(level, StringComparer.OrdinalIgnoreCase);

    public static string Normalize(string level) => level.Trim().ToLowerInvariant();

    public static bool CanWrite(string level)
    {
        var normalized = Normalize(level);
        return normalized is Help or Work;
    }

    public static bool CanCreateContent(string level) =>
        string.Equals(Normalize(level), Work, StringComparison.Ordinal);
}
