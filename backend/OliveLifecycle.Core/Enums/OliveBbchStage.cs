namespace OliveLifecycle.Core.Enums;

/// <summary>Olive BBCH stage ranges used for phenology gates.</summary>
public enum OliveBbchStage
{
    Unknown = 0,
    BudDevelopment = 1,
    LeafDevelopment = 2,
    ShootDevelopment = 3,
    InflorescenceDevelopment = 4,
    Flowering = 5,
    FruitDevelopment = 6,
    Ripening = 7,
    OverripeFruitFall = 8
}

public static class OliveBbchStageExtensions
{
    public static string ToApiString(this OliveBbchStage stage) => stage switch
    {
        OliveBbchStage.BudDevelopment => "00-09",
        OliveBbchStage.LeafDevelopment => "11-19",
        OliveBbchStage.ShootDevelopment => "31-37",
        OliveBbchStage.InflorescenceDevelopment => "50-59",
        OliveBbchStage.Flowering => "60-69",
        OliveBbchStage.FruitDevelopment => "71-79",
        OliveBbchStage.Ripening => "80-89",
        OliveBbchStage.OverripeFruitFall => "92",
        _ => "unknown"
    };

    public static OliveBbchStage FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "00-09" or "00_09" or "bud_development" => OliveBbchStage.BudDevelopment,
        "11-19" or "11_19" or "leaf_development" => OliveBbchStage.LeafDevelopment,
        "31-37" or "31_37" or "shoot_development" => OliveBbchStage.ShootDevelopment,
        "50-59" or "50_59" or "inflorescence_development" => OliveBbchStage.InflorescenceDevelopment,
        "60-69" or "60_69" or "flowering" => OliveBbchStage.Flowering,
        "71-79" or "71_79" or "fruit_development" => OliveBbchStage.FruitDevelopment,
        "80-89" or "80_89" or "ripening" => OliveBbchStage.Ripening,
        "92" or "overripe" or "overripe_fruit_fall" => OliveBbchStage.OverripeFruitFall,
        _ => OliveBbchStage.Unknown
    };

    public static int? MinCode(this OliveBbchStage stage) => stage switch
    {
        OliveBbchStage.BudDevelopment => 0,
        OliveBbchStage.LeafDevelopment => 11,
        OliveBbchStage.ShootDevelopment => 31,
        OliveBbchStage.InflorescenceDevelopment => 50,
        OliveBbchStage.Flowering => 60,
        OliveBbchStage.FruitDevelopment => 71,
        OliveBbchStage.Ripening => 80,
        OliveBbchStage.OverripeFruitFall => 92,
        _ => null
    };

    public static int? MaxCode(this OliveBbchStage stage) => stage switch
    {
        OliveBbchStage.BudDevelopment => 9,
        OliveBbchStage.LeafDevelopment => 19,
        OliveBbchStage.ShootDevelopment => 37,
        OliveBbchStage.InflorescenceDevelopment => 59,
        OliveBbchStage.Flowering => 69,
        OliveBbchStage.FruitDevelopment => 79,
        OliveBbchStage.Ripening => 89,
        OliveBbchStage.OverripeFruitFall => 92,
        _ => null
    };
}
