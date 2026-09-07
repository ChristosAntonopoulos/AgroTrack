namespace OliveLifecycle.Core.Enums;

public enum HarvestPhase
{
    Prepare,
    Daily,
    Final
}

public static class HarvestPhaseExtensions
{
    public static string ToApiString(this HarvestPhase phase) => phase switch
    {
        HarvestPhase.Daily => "daily",
        HarvestPhase.Final => "final",
        _ => "prepare"
    };

    public static HarvestPhase? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "prepare" or "pre" => HarvestPhase.Prepare,
        "daily" or "while" or "everyday" => HarvestPhase.Daily,
        "final" or "close" => HarvestPhase.Final,
        _ => null
    };
}

public static class HarvestPhaseCatalog
{
    private static readonly HashSet<string> PrepareTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "harvest_ready_nets",
        "harvest_book_mill",
        "harvest_call_crew",
        "harvest_check_access",
        "harvest_equipment_preparation",
        "harvest_planning",
        "pre_harvest_field_access_cleanup",
        "ripening_index_sampling"
    };

    private static readonly HashSet<string> DailyTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "harvest",
        "olive_harvest",
        "harvest_daily_kilos",
        "harvesting"
    };

    private static readonly HashSet<string> FinalTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "harvest_mill_delivery",
        "harvest_close_season",
        "post_harvest_field_inspection",
        "post_harvest_irrigation_check",
        "annual_field_report"
    };

    public static HarvestPhase? FromTypeOrTitle(string? type, string? title = null)
    {
        var key = (type ?? string.Empty).Trim();
        if (PrepareTypes.Contains(key)) return HarvestPhase.Prepare;
        if (DailyTypes.Contains(key)) return HarvestPhase.Daily;
        if (FinalTypes.Contains(key)) return HarvestPhase.Final;

        var haystack = $"{type} {title}".ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(haystack)) return null;

        if (haystack.Contains("post-harvest") || haystack.Contains("post harvest")
            || haystack.Contains("mill delivery") || haystack.Contains("close harvest")
            || haystack.Contains("close this harvest") || haystack.Contains("annual field report"))
        {
            return HarvestPhase.Final;
        }

        if (haystack.Contains("kilo") || haystack.Contains("daily harvest")
            || haystack.Contains("olive harvest") || haystack.Contains("today's harvest")
            || haystack.Contains("todays harvest") || haystack == "harvest" || haystack == "harvesting")
        {
            return HarvestPhase.Daily;
        }

        if (haystack.Contains("net") || haystack.Contains("crate") || haystack.Contains("book mill")
            || haystack.Contains("crew") || haystack.Contains("access") || haystack.Contains("harvest plan")
            || haystack.Contains("harvesting plan") || haystack.Contains("ripening")
            || haystack.Contains("prepare") || haystack.Contains("equipment preparation"))
        {
            return HarvestPhase.Prepare;
        }

        if (haystack.Contains("harvest") || haystack.Contains("τρύγος") || haystack.Contains("τρυγος"))
        {
            return HarvestPhase.Daily;
        }

        return null;
    }
}
