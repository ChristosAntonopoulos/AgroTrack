namespace OliveLifecycle.Core.Enums;

public enum TaskTimingBucket
{
    Today,
    Tomorrow,
    ThisWeek,
    Later
}

public static class TaskTimingBucketExtensions
{
    public static string ToApiString(this TaskTimingBucket bucket) => bucket switch
    {
        TaskTimingBucket.Tomorrow => "tomorrow",
        TaskTimingBucket.ThisWeek => "thisWeek",
        TaskTimingBucket.Later => "later",
        _ => "today"
    };

    public static TaskTimingBucket? FromApiString(string? value) => value?.Trim() switch
    {
        "today" => TaskTimingBucket.Today,
        "tomorrow" => TaskTimingBucket.Tomorrow,
        "thisWeek" or "this_week" => TaskTimingBucket.ThisWeek,
        "later" => TaskTimingBucket.Later,
        _ => null
    };
}
