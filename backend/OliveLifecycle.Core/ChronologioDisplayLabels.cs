using System.Globalization;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core;

/// <summary>
/// Human-readable Chronologio labels. API consumers must never show raw enums.
/// </summary>
public static class ChronologioDisplayLabels
{
    public static string Category(ChronologioCategory category, string language = "el") => category switch
    {
        ChronologioCategory.Expense => MoneyKind(isIncome: false, language),
        ChronologioCategory.Income => MoneyKind(isIncome: true, language),
        _ => PrimaryCategory(ChronologioPrimaryCategoryExtensions.FromSource(category), language, singular: true)
    };

    public static string PrimaryCategory(
        ChronologioPrimaryCategory category,
        string language = "el",
        bool singular = false) =>
        category switch
        {
            ChronologioPrimaryCategory.Work =>
                IsEnglish(language) ? (singular ? "Work" : "Work") : (singular ? "Εργασία" : "Εργασίες"),
            ChronologioPrimaryCategory.Observation =>
                IsEnglish(language)
                    ? (singular ? "Note" : "Notes")
                    : (singular ? "Παρατήρηση" : "Παρατηρήσεις"),
            ChronologioPrimaryCategory.Money =>
                IsEnglish(language) ? "Money" : "Χρήματα",
            ChronologioPrimaryCategory.Harvest =>
                IsEnglish(language) ? "Harvest" : "Συγκομιδή",
            ChronologioPrimaryCategory.Weather =>
                IsEnglish(language)
                    ? (singular ? "Weather" : "Weather & warnings")
                    : (singular ? "Καιρός" : "Καιρός & προειδοποιήσεις"),
            ChronologioPrimaryCategory.FieldChange =>
                IsEnglish(language) ? "Field change" : "Αλλαγές χωραφιού",
            _ => IsEnglish(language) ? "Activity" : "Δραστηριότητα"
        };

    public static string MoneyKind(bool isIncome, string language = "el") =>
        isIncome
            ? (IsEnglish(language) ? "Income" : "Έσοδο")
            : (IsEnglish(language) ? "Expense" : "Έξοδο");

    public static string HarvestSummary(
        double oliveKg,
        double? oilKg,
        decimal? oilLitres,
        double? yieldPercent,
        string language = "el")
    {
        var culture = Culture(language);
        var parts = new List<string>
        {
            IsEnglish(language)
                ? $"{oliveKg.ToString("0.##", culture)} kg olives"
                : $"{oliveKg.ToString("0.##", culture)} kg ελιές"
        };

        if (oilLitres is > 0)
        {
            parts.Add(IsEnglish(language)
                ? $"{oilLitres.Value.ToString("0.##", culture)} L oil"
                : $"{oilLitres.Value.ToString("0.##", culture)} L λάδι");
        }
        else if (oilKg is > 0)
        {
            parts.Add(IsEnglish(language)
                ? $"{oilKg.Value.ToString("0.##", culture)} kg oil"
                : $"{oilKg.Value.ToString("0.##", culture)} kg λάδι");
        }

        if (yieldPercent is > 0)
        {
            parts.Add($"{yieldPercent.Value.ToString("0.#", culture)}%");
        }

        return string.Join(" · ", parts);
    }

    public static string WeatherReviewSummary(
        double? rainMm,
        double? minTemp,
        double? maxTemp,
        int? frostNights,
        bool isMonth,
        string language = "el")
    {
        var culture = Culture(language);
        var parts = new List<string>();
        if (rainMm.HasValue)
        {
            parts.Add(IsEnglish(language)
                ? $"{rainMm.Value.ToString("0.#", culture)} mm rain"
                : $"{rainMm.Value.ToString("0.#", culture)} mm βροχή");
        }

        if (maxTemp.HasValue)
        {
            parts.Add(IsEnglish(language)
                ? $"high {maxTemp.Value.ToString("0.#", culture)}°C"
                : $"έως {maxTemp.Value.ToString("0.#", culture)}°C");
        }

        if (isMonth && minTemp.HasValue)
        {
            parts.Add(IsEnglish(language)
                ? $"low {minTemp.Value.ToString("0.#", culture)}°C"
                : $"από {minTemp.Value.ToString("0.#", culture)}°C");
        }
        else if (!isMonth && frostNights is > 0)
        {
            parts.Add(IsEnglish(language)
                ? $"{frostNights} frost nights"
                : $"{frostNights} νύχτες παγετού");
        }

        return string.Join(" · ", parts);
    }

    public static string VegetationNote(double ndviDeltaPercent, bool isMonth, string language = "el")
    {
        if (Math.Abs(ndviDeltaPercent) < 5)
        {
            return string.Empty;
        }

        if (IsEnglish(language))
        {
            return ndviDeltaPercent > 0
                ? (isMonth ? "Trees looked greener than the previous month." : "Trees looked greener than the previous year.")
                : (isMonth ? "Trees looked less green than the previous month." : "Trees looked less green than the previous year.");
        }

        return ndviDeltaPercent > 0
            ? (isMonth ? "Τα δέντρα φαίνονταν πιο πράσινα από τον προηγούμενο μήνα." : "Τα δέντρα φαίνονταν πιο πράσινα από την προηγούμενη χρονιά.")
            : (isMonth ? "Τα δέντρα φαίνονταν λιγότερο πράσινα από τον προηγούμενο μήνα." : "Τα δέντρα φαίνονταν λιγότερο πράσινα από την προηγούμενη χρονιά.");
    }

    public static string NoteTitle(string language = "el") => Category(ChronologioCategory.Note, language);

    public static string HarvestTitle(string language = "el") => Category(ChronologioCategory.Harvest, language);

    public static string TaskFallbackTitle(string language = "el") => Category(ChronologioCategory.Task, language);

    public static string OutcomeSummary(TaskExecutionOutcome outcome, string language = "el") => outcome switch
    {
        TaskExecutionOutcome.PartiallyCompleted => IsEnglish(language) ? "Partially completed" : "Μερικώς ολοκληρώθηκε",
        TaskExecutionOutcome.NotDone => IsEnglish(language) ? "Not done" : "Δεν έγινε",
        _ => IsEnglish(language) ? "Completed" : "Ολοκληρώθηκε"
    };

    public static string ActivityTitle(string activityType, string language = "el") => activityType switch
    {
        "lifecycle_year_changed" => IsEnglish(language) ? "Lifecycle year changed" : "Άλλαξε το έτος κύκλου",
        "lifecycle_stage_changed" => IsEnglish(language) ? "Lifecycle stage changed" : "Άλλαξε το στάδιο κύκλου",
        "lifecycle_corrected" => IsEnglish(language) ? "Lifecycle corrected" : "Διόρθωση κύκλου ζωής",
        "producer_assigned" => IsEnglish(language) ? "Producer assigned" : "Ανατέθηκε παραγωγός",
        "producer_unassigned" => IsEnglish(language) ? "Producer unassigned" : "Αφαιρέθηκε παραγωγός",
        "partner_contact_accepted" => IsEnglish(language) ? "Partner contact accepted" : "Αποδοχή συνεργασίας",
        _ => Category(ChronologioCategory.Activity, language)
    };

    public static string WeatherMonthTitle(int year, int month, string language = "el")
    {
        var culture = IsEnglish(language) ? CultureInfo.GetCultureInfo("en-US") : CultureInfo.GetCultureInfo("el-GR");
        var monthName = culture.DateTimeFormat.GetMonthName(month);
        return IsEnglish(language) ? $"{monthName} {year} weather" : $"Καιρός {monthName} {year}";
    }

    public static string WeatherYearTitle(int year, string language = "el") =>
        IsEnglish(language) ? $"{year} weather" : $"Καιρός {year}";

    public static string HarvestQuality(string? quality, string language = "el")
    {
        if (string.IsNullOrWhiteSpace(quality))
        {
            return string.Empty;
        }

        var key = quality.Trim().ToLowerInvariant().Replace(' ', '_').Replace('-', '_');
        return key switch
        {
            "extra_virgin" or "έξτρα_παρθένο" or "εξτρα_παρθενο" =>
                IsEnglish(language) ? "Extra virgin" : "Έξτρα παρθένο",
            "virgin" or "παρθένο" or "παρθενο" =>
                IsEnglish(language) ? "Virgin" : "Παρθένο",
            "lampante" => IsEnglish(language) ? "Lampante" : "Λαμπάντε",
            _ => LooksLikeCode(quality) ? string.Empty : quality.Trim()
        };
    }

    public static string LifecycleStage(string? stage, string language = "el")
    {
        if (string.IsNullOrWhiteSpace(stage))
        {
            return string.Empty;
        }

        return stage.Trim().ToLowerInvariant().Replace(' ', '_').Replace('-', '_') switch
        {
            "bud_break" or "bud_development" => IsEnglish(language) ? "Bud development" : "Ανάπτυξη οφθαλμών",
            "leaf_development" => IsEnglish(language) ? "Leaf development" : "Ανάπτυξη φύλλων",
            "shoot_development" => IsEnglish(language) ? "Shoot development" : "Ανάπτυξη βλαστών",
            "inflorescence_development" => IsEnglish(language) ? "Inflorescence development" : "Ανάπτυξη ανθοταξίας",
            "flowering" => IsEnglish(language) ? "Flowering" : "Άνθιση",
            "fruit_development" or "fruit_set" => IsEnglish(language) ? "Fruit development" : "Ανάπτυξη καρπού",
            "ripening" => IsEnglish(language) ? "Ripening" : "Ωρίμανση",
            "overripe_fruit_fall" => IsEnglish(language) ? "Overripe / fruit fall" : "Υπερώριμο / πτώση καρπού",
            _ => LooksLikeCode(stage) ? string.Empty : stage.Trim()
        };
    }

    /// <summary>Maps known demo Latin spellings to the Greek names used in the selector.</summary>
    public static string ActorName(string? name, string language = "el")
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return string.Empty;
        }

        var trimmed = name.Trim();
        if (!IsEnglish(language))
        {
            return trimmed.ToLowerInvariant() switch
            {
                "giorgos papadakis" => "Γιώργος Παπαδάκης",
                "giorgos papadopoulos" => "Γιώργος Παπαδόπουλος",
                "kostas manousakis" => "Κώστας Μανούσακης",
                _ => trimmed
            };
        }

        return trimmed switch
        {
            "Γιώργος Παπαδάκης" => "Giorgos Papadakis",
            "Γιώργος Παπαδόπουλος" => "Giorgos Papadopoulos",
            "Κώστας Μανούσακης" => "Kostas Manousakis",
            _ => trimmed
        };
    }

    public static bool LooksLikeCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        var text = value.Trim();
        if (text.StartsWith('T') && text.Length == 3 && char.IsDigit(text[1]) && char.IsDigit(text[2]))
        {
            return true;
        }

        return text.All(ch => ch is (>= 'a' and <= 'z') or (>= '0' and <= '9') or '_' or '-')
               && !text.Contains(' ');
    }

    private static CultureInfo Culture(string language) =>
        IsEnglish(language) ? CultureInfo.GetCultureInfo("en-US") : CultureInfo.GetCultureInfo("el-GR");

    private static bool IsEnglish(string language) =>
        language.StartsWith("en", StringComparison.OrdinalIgnoreCase);
}
