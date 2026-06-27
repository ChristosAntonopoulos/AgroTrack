namespace OliveLifecycle.Core.Enums;

public static class OliveLifecycleStage
{
    public const string Dormancy = "dormancy";
    public const string BudBreak = "bud_break";
    public const string Flowering = "flowering";
    public const string FruitSet = "fruit_set";
    public const string FruitGrowth = "fruit_growth";
    public const string Harvest = "harvest";

    public static readonly string[] OrderedStages =
    {
        Dormancy,
        BudBreak,
        Flowering,
        FruitSet,
        FruitGrowth,
        Harvest
    };

    public static string? GetNext(string current)
    {
        var index = Array.IndexOf(OrderedStages, current);
        if (index < 0 || index >= OrderedStages.Length - 1)
        {
            return null;
        }
        return OrderedStages[index + 1];
    }

    public static string? GetPrevious(string current)
    {
        var index = Array.IndexOf(OrderedStages, current);
        if (index <= 0)
        {
            return null;
        }
        return OrderedStages[index - 1];
    }

    public static string Normalize(string? stage) =>
        string.IsNullOrEmpty(stage) ? Dormancy : stage;
}
