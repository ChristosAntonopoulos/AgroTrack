using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.FieldWork;

public static class WeatherSuitabilityHorizon
{
    /// <summary>Within this lead time a day may still be ranked Good.</summary>
    public const int GoodEligibleMaxHours = 72;

    /// <summary>4–7 day window is tentative: Caution at best, never Good.</summary>
    public const int TentativeMaxHours = 7 * 24;

    /// <summary>Forecast older than this is treated as Unknown.</summary>
    public const int StaleForecastMaxHours = 6;
}

public sealed class WeatherSuitabilityThresholds
{
    public double SprayingMaxWindKmh { get; init; } = 20;
    public double SprayingMaxGustKmh { get; init; } = 30;
    public double SprayingMinHumidityPercent { get; init; } = 40;
    public double SprayingMaxHumidityPercent { get; init; } = 90;
    public double SprayingRainToleranceMm { get; init; } = 1;
    public double IrrigationRainThresholdMm { get; init; } = 5;
    public double HarvestMaxWindKmh { get; init; } = 35;
    public double HarvestRainCautionMm { get; init; } = 1;
    public double HarvestRainUnsuitableMm { get; init; } = 5;
    public double FertiliserLeachingRainMm { get; init; } = 10;
    public double HeatStressTempC { get; init; } = 35;
    public double DefaultRainCautionMm { get; init; } = 5;
    public double DefaultWindCautionKmh { get; init; } = 40;
}

public sealed record WeatherSuitabilityEvaluationInput
{
    public required DateTime UtcNow { get; init; }
    public DateTime? CandidateStart { get; init; }
    public bool HasWeatherData { get; init; }
    public DateTime? ForecastFetchedAt { get; init; }
    public string? WeatherRuleProfile { get; init; }
    public bool RequiresProductLabel { get; init; }
    public PlantProtectionProductLabel? ProductLabel { get; init; }
    public double RainMmInWindow { get; init; }
    public double MaxWindKmhInWindow { get; init; }
    public double MaxGustKmhInWindow { get; init; }
    public double? HumidityPercent { get; init; }
    public double? MaxTempC { get; init; }
    public WeatherSuitabilityThresholds Thresholds { get; init; } = new();
    public string Language { get; init; } = "el";
}

public sealed record WeatherSuitabilityEvaluationResult
{
    public WeatherSuitability Suitability { get; init; }
    public int Score { get; init; }
    public int ForecastHorizonHours { get; init; }
    public IReadOnlyList<string> Reasons { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> HardBlockers { get; init; } = Array.Empty<string>();
}

/// <summary>
/// Pure Field-task weather suitability ranking. Does not mutate planned dates.
/// Replaces keyword-based TaskConditionEvaluator for FieldTasks.
/// </summary>
public static class WeatherSuitabilityEvaluator
{
    public static bool ProfileRequiresProductLabel(string? weatherRuleProfile) =>
        weatherRuleProfile is "spraying" or "plant_protection" or "plant_protection_treatment" or "pesticide";

    public static WeatherSuitabilityEvaluationResult Evaluate(WeatherSuitabilityEvaluationInput input)
    {
        var reasons = new List<string>();
        var blockers = new List<string>();
        var leadHours = ComputeLeadHours(input.CandidateStart, input.UtcNow);
        var horizonHours = (int)Math.Ceiling(Math.Max(leadHours, 0));

        if (!input.HasWeatherData)
        {
            reasons.Add(Msg(input.Language,
                "Δεν υπάρχουν αρκετά δεδομένα καιρού.",
                "Not enough weather data."));
            return Unknown(horizonHours, reasons, blockers, score: 0);
        }

        if (IsForecastStale(input.ForecastFetchedAt, input.UtcNow))
        {
            reasons.Add(Msg(input.Language,
                "Η πρόγνωση είναι παλιά (πάνω από 6 ώρες) και δεν χρησιμοποιείται για κατάταξη.",
                "The forecast is stale (older than 6 hours) and is not used for ranking."));
            return Unknown(horizonHours, reasons, blockers, score: 10);
        }

        if (input.RequiresProductLabel || ProfileRequiresProductLabel(input.WeatherRuleProfile))
        {
            if (input.ProductLabel is null || !input.ProductLabel.HasUsableConstraints)
            {
                var missing = FieldWorkDisplayLabels.MissingProductLabel(input.Language);
                reasons.Add(missing);
                blockers.Add("missing_product_label");
                return Unknown(horizonHours, reasons, blockers, score: 5);
            }

            if (input.ProductLabel.IsApprovedForCropAndTarget == false)
            {
                reasons.Add(Msg(input.Language,
                    "Το προϊόν δεν εμφανίζεται ως εγκεκριμένο για την καλλιέργεια και τον στόχο. Ελέγξτε την ετικέτα ή συμβουλευτείτε γεωπόνο.",
                    "The product is not recorded as approved for this crop and target. Verify the label or consult an agronomist."));
                blockers.Add("product_not_approved");
                return Result(WeatherSuitability.Unsuitable, horizonHours, reasons, blockers, score: 15);
            }
        }

        if (leadHours > WeatherSuitabilityHorizon.TentativeMaxHours)
        {
            reasons.Add(Msg(input.Language,
                "Η ημερομηνία είναι πέρα από 7 ημέρες — δεν μπορεί να χαρακτηριστεί καλή ημέρα από την πρόγνωση.",
                "The date is more than 7 days out — it cannot be ranked as a good day from the forecast."));
            return Unknown(horizonHours, reasons, blockers, score: 20);
        }

        var profile = (input.WeatherRuleProfile ?? "default").Trim().ToLowerInvariant();
        var suitability = RankProfile(profile, input, reasons, blockers);

        if (leadHours > WeatherSuitabilityHorizon.GoodEligibleMaxHours
            && suitability == WeatherSuitability.Good)
        {
            reasons.Add(Msg(input.Language,
                "Η πρόγνωση για 4–7 ημέρες είναι προσωρινή — όχι «καλή ημέρα».",
                "The 4–7 day forecast is tentative — not a “good day”."));
            suitability = WeatherSuitability.Caution;
        }

        var score = suitability switch
        {
            WeatherSuitability.Good => 90,
            WeatherSuitability.Caution => 55,
            WeatherSuitability.Unsuitable => 20,
            _ => 30
        };

        if (reasons.Count == 0)
        {
            reasons.Add(suitability switch
            {
                WeatherSuitability.Good => Msg(input.Language,
                    "Οι συνθήκες στην πρόγνωση φαίνονται κατάλληλες για το παράθυρο εργασίας.",
                    "Forecast conditions look suitable for the work window."),
                WeatherSuitability.Caution => Msg(input.Language,
                    "Οι συνθήκες θέλουν προσοχή — ελέγξτε πριν προχωρήσετε.",
                    "Conditions need caution — review before proceeding."),
                WeatherSuitability.Unsuitable => Msg(input.Language,
                    "Οι συνθήκες φαίνονται ακατάλληλες για το παράθυρο εργασίας.",
                    "Conditions look unsuitable for the work window."),
                _ => Msg(input.Language,
                    "Δεν υπάρχουν αρκετά δεδομένα.",
                    "Not enough data.")
            });
        }

        return Result(suitability, horizonHours, reasons, blockers, score);
    }

    private static WeatherSuitability RankProfile(
        string profile,
        WeatherSuitabilityEvaluationInput input,
        List<string> reasons,
        List<string> blockers)
    {
        var t = input.Thresholds;
        return profile switch
        {
            "spraying" or "plant_protection" or "plant_protection_treatment" or "pesticide"
                => RankSpraying(input, reasons, blockers),
            "irrigation" => RankIrrigation(input, reasons, blockers),
            "harvest" => RankHarvest(input, reasons, blockers),
            "surface_fertilisation" or "fertilisation" => RankFertilisation(input, reasons, blockers),
            "heat_stress" => RankHeat(input, reasons, blockers),
            _ => RankDefault(input, reasons, blockers)
        };
    }

    private static WeatherSuitability RankSpraying(
        WeatherSuitabilityEvaluationInput input,
        List<string> reasons,
        List<string> blockers)
    {
        var t = input.Thresholds;
        var maxWind = input.ProductLabel?.MaxWindKmh ?? t.SprayingMaxWindKmh;
        var maxGust = input.ProductLabel?.MaxGustKmh ?? t.SprayingMaxGustKmh;
        var minRh = input.ProductLabel?.MinHumidityPercent ?? t.SprayingMinHumidityPercent;
        var maxRh = input.ProductLabel?.MaxHumidityPercent ?? t.SprayingMaxHumidityPercent;
        var rainfastHours = input.ProductLabel?.RainfastHours ?? 2;
        // Approximate rainfast rain with window rain when a dedicated post-application series is unavailable.
        var rainLimit = t.SprayingRainToleranceMm;

        if (input.MaxGustKmhInWindow >= maxGust * 1.25 || input.MaxWindKmhInWindow >= maxWind * 1.25)
        {
            blockers.Add("wind_too_high");
            reasons.Add(Msg(input.Language,
                $"Άνεμος/ριπές υψηλές για ψεκασμό (έως {input.MaxGustKmhInWindow:0} km/h).",
                $"Wind/gusts too high for spraying (up to {input.MaxGustKmhInWindow:0} km/h)."));
            return WeatherSuitability.Unsuitable;
        }

        if (input.RainMmInWindow >= rainLimit)
        {
            blockers.Add("rain_in_window");
            reasons.Add(Msg(input.Language,
                $"Βροχή στην περίοδο (~{input.RainMmInWindow:0.#} mm) — κίνδυνος έκπλυσης (rainfast ~{rainfastHours:0.#} ώρες).",
                $"Rain in the window (~{input.RainMmInWindow:0.#} mm) — wash-off risk (rainfast ~{rainfastHours:0.#} h)."));
            return WeatherSuitability.Unsuitable;
        }

        if (input.MaxWindKmhInWindow >= maxWind || input.MaxGustKmhInWindow >= maxGust)
        {
            reasons.Add(Msg(input.Language,
                "Ο άνεμος πλησιάζει τα όρια της ετικέτας / κανόνων.",
                "Wind is near label / rule limits."));
            return WeatherSuitability.Caution;
        }

        if (input.HumidityPercent is { } rh && (rh < minRh || rh > maxRh))
        {
            reasons.Add(Msg(input.Language,
                $"Η υγρασία ({rh:0}%) είναι εκτός του προτιμώμενου εύρους.",
                $"Humidity ({rh:0}%) is outside the preferred range."));
            return WeatherSuitability.Caution;
        }

        return WeatherSuitability.Good;
    }

    private static WeatherSuitability RankIrrigation(
        WeatherSuitabilityEvaluationInput input,
        List<string> reasons,
        List<string> blockers)
    {
        if (input.RainMmInWindow >= input.Thresholds.IrrigationRainThresholdMm)
        {
            reasons.Add(Msg(input.Language,
                $"Αναμένεται αρκετή βροχή (~{input.RainMmInWindow:0.#} mm) — η άρδευση μπορεί να μην χρειάζεται.",
                $"Enough rain is expected (~{input.RainMmInWindow:0.#} mm) — irrigation may not be needed."));
            return WeatherSuitability.Caution;
        }

        return WeatherSuitability.Good;
    }

    private static WeatherSuitability RankHarvest(
        WeatherSuitabilityEvaluationInput input,
        List<string> reasons,
        List<string> blockers)
    {
        if (input.RainMmInWindow >= input.Thresholds.HarvestRainUnsuitableMm
            || input.MaxWindKmhInWindow >= input.Thresholds.HarvestMaxWindKmh * 1.2)
        {
            blockers.Add("harvest_conditions");
            reasons.Add(Msg(input.Language,
                "Βροχή ή δυνατός άνεμος δυσκολεύουν τη συγκομιδή.",
                "Rain or strong wind make harvest difficult."));
            return WeatherSuitability.Unsuitable;
        }

        if (input.RainMmInWindow >= input.Thresholds.HarvestRainCautionMm
            || input.MaxWindKmhInWindow >= input.Thresholds.HarvestMaxWindKmh)
        {
            reasons.Add(Msg(input.Language,
                "Οι συνθήκες συγκομιδής θέλουν προσοχή.",
                "Harvest conditions need caution."));
            return WeatherSuitability.Caution;
        }

        return WeatherSuitability.Good;
    }

    private static WeatherSuitability RankFertilisation(
        WeatherSuitabilityEvaluationInput input,
        List<string> reasons,
        List<string> blockers)
    {
        if (input.RainMmInWindow >= input.Thresholds.FertiliserLeachingRainMm)
        {
            blockers.Add("leaching_rain");
            reasons.Add(Msg(input.Language,
                $"Ισχυρή βροχή (~{input.RainMmInWindow:0.#} mm) — κίνδυνος έκπλυσης λιπάσματος.",
                $"Heavy rain (~{input.RainMmInWindow:0.#} mm) — fertiliser leaching risk."));
            return WeatherSuitability.Unsuitable;
        }

        if (input.RainMmInWindow >= input.Thresholds.DefaultRainCautionMm)
        {
            reasons.Add(Msg(input.Language,
                "Βροχή στην περίοδο — προσοχή στην επιφανειακή λίπανση.",
                "Rain in the window — caution for surface fertilisation."));
            return WeatherSuitability.Caution;
        }

        return WeatherSuitability.Good;
    }

    private static WeatherSuitability RankHeat(
        WeatherSuitabilityEvaluationInput input,
        List<string> reasons,
        List<string> blockers)
    {
        if (input.MaxTempC >= input.Thresholds.HeatStressTempC)
        {
            reasons.Add(Msg(input.Language,
                $"Υψηλή θερμοκρασία (~{input.MaxTempC:0.#}°C).",
                $"High temperature (~{input.MaxTempC:0.#}°C)."));
            return WeatherSuitability.Caution;
        }

        return WeatherSuitability.Good;
    }

    private static WeatherSuitability RankDefault(
        WeatherSuitabilityEvaluationInput input,
        List<string> reasons,
        List<string> blockers)
    {
        if (input.RainMmInWindow >= input.Thresholds.DefaultRainCautionMm * 2
            || input.MaxWindKmhInWindow >= input.Thresholds.DefaultWindCautionKmh * 1.25)
        {
            reasons.Add(Msg(input.Language,
                "Δύσκολες καιρικές συνθήκες για εργασία στο χωράφι.",
                "Difficult weather for field work."));
            return WeatherSuitability.Unsuitable;
        }

        if (input.RainMmInWindow >= input.Thresholds.DefaultRainCautionMm
            || input.MaxWindKmhInWindow >= input.Thresholds.DefaultWindCautionKmh)
        {
            reasons.Add(Msg(input.Language,
                "Οι συνθήκες θέλουν προσοχή.",
                "Conditions need caution."));
            return WeatherSuitability.Caution;
        }

        return WeatherSuitability.Good;
    }

    public static double ComputeLeadHours(DateTime? candidateStart, DateTime utcNow)
    {
        if (!candidateStart.HasValue) return 0;
        return (candidateStart.Value.ToUniversalTime() - utcNow.ToUniversalTime()).TotalHours;
    }

    public static bool IsForecastStale(DateTime? fetchedAt, DateTime utcNow)
    {
        if (!fetchedAt.HasValue) return true;
        return (utcNow.ToUniversalTime() - fetchedAt.Value.ToUniversalTime()).TotalHours
               > WeatherSuitabilityHorizon.StaleForecastMaxHours;
    }

    private static WeatherSuitabilityEvaluationResult Unknown(
        int horizonHours,
        List<string> reasons,
        List<string> blockers,
        int score) =>
        Result(WeatherSuitability.Unknown, horizonHours, reasons, blockers, score);

    private static WeatherSuitabilityEvaluationResult Result(
        WeatherSuitability suitability,
        int horizonHours,
        List<string> reasons,
        List<string> blockers,
        int score) => new()
    {
        Suitability = suitability,
        Score = score,
        ForecastHorizonHours = horizonHours,
        Reasons = reasons.ToArray(),
        HardBlockers = blockers.ToArray()
    };

    private static string Msg(string language, string greek, string english) =>
        language.StartsWith("en", StringComparison.OrdinalIgnoreCase) ? english : greek;
}
