using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Core.FieldWork;

public static class CandidateWindowCalculator
{
    /// <summary>
    /// Resolves a month-day range into concrete UTC midnight bounds for a result year.
    /// Ranges that wrap the year (e.g. Oct–Jan) use resultYear for the start and resultYear+1 for the end.
    /// </summary>
    public static (DateTime Start, DateTime End)? Resolve(MonthDayRange? range, int resultYear)
    {
        if (range is null)
        {
            return null;
        }

        var startYear = resultYear;
        var endYear = range.EndMonth < range.StartMonth ||
                      (range.EndMonth == range.StartMonth && range.EndDay < range.StartDay)
            ? resultYear + 1
            : resultYear;

        var start = SafeDate(startYear, range.StartMonth, range.StartDay);
        var end = SafeDate(endYear, range.EndMonth, range.EndDay);
        return (start, end.AddDays(1).AddTicks(-1));
    }

    public static bool Contains(MonthDayRange? range, DateTime utcNow, int resultYear)
    {
        var window = Resolve(range, resultYear);
        if (window is null)
        {
            return true;
        }

        var athens = AthensTime.CalendarDate(utcNow);
        var start = AthensTime.CalendarDate(window.Value.Start);
        var end = AthensTime.CalendarDate(window.Value.End);
        return athens >= start && athens <= end;
    }

    private static DateTime SafeDate(int year, int month, int day)
    {
        var dim = DateTime.DaysInMonth(year, month);
        var safeDay = Math.Min(day, dim);
        return new DateTime(year, month, safeDay, 0, 0, 0, DateTimeKind.Utc);
    }
}

/// <summary>
/// Phenology gates: wrong stage suppresses; unknown stage never invents a month-based stage.
/// </summary>
public static class BbchGate
{
    public static bool Allows(BbchRange? required, FieldPhenologySnapshot phenology, bool allowUnknown)
    {
        if (required is null)
        {
            return true;
        }

        if (!phenology.IsKnown || phenology.StageCode == OliveBbchStage.Unknown)
        {
            return allowUnknown;
        }

        return required.Contains(phenology.StageCode);
    }
}

public sealed class ProposalCandidate
{
    public required string TemplateCode { get; init; }
    public int TemplateVersion { get; init; } = FieldWorkCatalogue.Version;
    public required string RuleCode { get; init; }
    public required ProposalSourceType SourceType { get; init; }
    public required ProposalConfidence Confidence { get; init; }
    public required string GreekExplanation { get; init; }
    public string? EnglishExplanation { get; init; }
    public List<string> ReasonCodes { get; init; } = [];
    public string? SourceReference { get; init; }
    public DateTime? WindowStart { get; init; }
    public DateTime? WindowEnd { get; init; }
    public WeatherSuitability WeatherSuitability { get; init; } = WeatherSuitability.Unknown;
    public TemplateEligibilityStatus EligibilityStatus { get; init; } = TemplateEligibilityStatus.Enabled;
    public string? EligibilityReasonCode { get; init; }
    public int? NextEligibleYear { get; init; }
    public int? RemainingExpectedInstances { get; init; }
}

public sealed record ProposalEvaluationContext
{
    public required string FieldId { get; init; }
    public required FieldStatus FieldStatus { get; init; }
    public required bool IsIrrigated { get; init; }
    public required int ResultYear { get; init; }
    public required DateTime UtcNow { get; init; }
    public required FieldPhenologySnapshot Phenology { get; init; }
    public IReadOnlyList<string> DismissedTemplateCodesForYear { get; init; } = [];
    public IReadOnlyList<OfficialAgriculturalWarning> ActiveWarnings { get; init; } = [];
    public bool HasWeatherData { get; init; }
    public WeatherSuitability ObservedWeatherSuitability { get; init; } = WeatherSuitability.Unknown;
    public IReadOnlySet<string>? OpenTaskTemplateCodes { get; init; }
    public FieldWorkEventSignals EventSignals { get; init; } = new();
    /// <summary>Active FieldWorkProfile only — draft profiles must not drive proposals.</summary>
    public FieldWorkProfile? WorkProfile { get; init; }
    public IReadOnlyDictionary<string, int> CompletedCountsByTemplate { get; init; } =
        new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
    public bool HasAnalysisEvidence { get; init; }
    public bool HasObservationEvidence { get; init; }
    public bool HasAgronomistEvidence { get; init; }
}

/// <summary>
/// Pure proposal rule evaluation. Never creates FieldTasks. Never recommends pesticide doses.
/// </summary>
public static class ProposalRuleEvaluator
{
    public static IReadOnlyList<ProposalCandidate> Evaluate(
        ProposalEvaluationContext context,
        IReadOnlyList<FieldWorkCatalogueEntry>? catalogue = null)
    {
        if (!ProposalEligibility.CanReceiveProposals(context.FieldStatus))
        {
            return [];
        }

        var entries = catalogue ?? FieldWorkCatalogue.All.Concat(FieldWorkEventCatalogue.All).ToList();
        var byTemplate = new Dictionary<string, ProposalCandidate>(StringComparer.OrdinalIgnoreCase);

        foreach (var entry in entries)
        {
            if (context.DismissedTemplateCodesForYear.Contains(entry.Code, StringComparer.OrdinalIgnoreCase))
            {
                continue;
            }

            if (entry.RequiresIrrigatedField && !context.IsIrrigated)
            {
                continue;
            }

            if (context.OpenTaskTemplateCodes?.Contains(entry.Code) == true)
            {
                // Already have an open planned/in-progress task for this template.
                continue;
            }

            foreach (var rule in entry.Rules)
            {
                if (!TryBuildCandidate(entry, rule, context, out var candidate) || candidate is null)
                {
                    continue;
                }

                if (!TryApplyProfileEligibility(entry, context, candidate, out var eligible) || eligible is null)
                {
                    continue;
                }

                if (!byTemplate.TryGetValue(entry.Code, out var existing)
                    || eligible.SourceType.Precedence() > existing.SourceType.Precedence())
                {
                    byTemplate[entry.Code] = eligible;
                }
            }

            // Official warnings can unlock field-scoped proposals even without a seasonal rule match.
            foreach (var warning in context.ActiveWarnings.Where(w =>
                         w.IsActive
                         && (w.FieldIds.Count == 0 || w.FieldIds.Contains(context.FieldId, StringComparer.Ordinal))
                         && w.TemplateCodes.Contains(entry.Code, StringComparer.OrdinalIgnoreCase)))
            {
                var warningCandidate = FromWarning(entry, warning, context);
                if (warningCandidate is null)
                {
                    continue;
                }

                if (!TryApplyProfileEligibility(entry, context, warningCandidate, out var eligible) || eligible is null)
                {
                    continue;
                }

                if (!byTemplate.TryGetValue(entry.Code, out var existing)
                    || eligible.SourceType.Precedence() > existing.SourceType.Precedence())
                {
                    byTemplate[entry.Code] = eligible;
                }
            }
        }

        return byTemplate.Values
            .OrderByDescending(c => c.SourceType.Precedence())
            .ThenBy(c => c.TemplateCode)
            .ToList();
    }

    /// <summary>
    /// Applies Active FieldWorkProfile eligibility. Returns false when the candidate is suppressed.
    /// Official/safety candidates are never suppressed by “I don’t …” preferences.
    /// </summary>
    private static bool TryApplyProfileEligibility(
        FieldWorkCatalogueEntry entry,
        ProposalEvaluationContext context,
        ProposalCandidate candidate,
        out ProposalCandidate? eligible)
    {
        eligible = null;

        var eligibility = FieldWorkProfileEligibility.EvaluateTemplateForField(new TemplateEligibilityContext
        {
            Entry = entry,
            FieldId = context.FieldId,
            Profile = context.WorkProfile,
            ResultYear = context.ResultYear,
            UtcNow = context.UtcNow,
            DefaultConfidence = candidate.Confidence,
            CandidateSourceType = candidate.SourceType,
            TreatAsOfficialOrSafetyInformation = candidate.SourceType == ProposalSourceType.OfficialWarning,
            ActiveWarnings = context.ActiveWarnings,
            EventSignals = context.EventSignals,
            CompletedCountsByTemplate = context.CompletedCountsByTemplate,
            HasAnalysisEvidence = context.HasAnalysisEvidence,
            HasObservationEvidence = context.HasObservationEvidence,
            HasAgronomistEvidence = context.HasAgronomistEvidence
        });

        if (eligibility.Status == TemplateEligibilityStatus.Suppressed)
        {
            return false;
        }

        var greek = candidate.GreekExplanation;
        var english = candidate.EnglishExplanation;
        var confidence = eligibility.Confidence;
        var reasons = candidate.ReasonCodes.ToList();

        if (eligibility.Status == TemplateEligibilityStatus.AskFirst)
        {
            greek = eligibility.GreekReason + " " + greek;
            english = string.IsNullOrWhiteSpace(english)
                ? eligibility.EnglishReason
                : eligibility.EnglishReason + " " + english;
            confidence = ProposalConfidence.WorthChecking;
            reasons.Insert(0, eligibility.ReasonCode);
        }
        else if (eligibility.IsSafetyOrOfficialOverride
                 || eligibility.ReasonCode is not (ReasonCodes.NoActiveProfile or ReasonCodes.NotPersonalised))
        {
            // Keep catalogue explanation; attach a stable personalisation reason code for analytics/tests.
            if (!reasons.Contains(eligibility.ReasonCode, StringComparer.OrdinalIgnoreCase))
            {
                reasons.Add(eligibility.ReasonCode);
            }

            // Prefer stronger catalogue confidence when profile only confirms enablement.
            if (candidate.Confidence == ProposalConfidence.StrongEvidence
                || eligibility.IsSafetyOrOfficialOverride)
            {
                confidence = candidate.Confidence;
            }
        }

        eligible = new ProposalCandidate
        {
            TemplateCode = candidate.TemplateCode,
            TemplateVersion = candidate.TemplateVersion,
            RuleCode = candidate.RuleCode,
            SourceType = candidate.SourceType,
            Confidence = confidence,
            GreekExplanation = greek,
            EnglishExplanation = english,
            ReasonCodes = reasons,
            SourceReference = candidate.SourceReference,
            WindowStart = candidate.WindowStart,
            WindowEnd = candidate.WindowEnd,
            WeatherSuitability = candidate.WeatherSuitability,
            EligibilityStatus = eligibility.Status,
            EligibilityReasonCode = eligibility.ReasonCode,
            NextEligibleYear = eligibility.NextEligibleYear,
            RemainingExpectedInstances = eligibility.RemainingExpectedInstances
        };
        return true;
    }

    private static bool TryBuildCandidate(
        FieldWorkCatalogueEntry entry,
        CatalogueRule rule,
        ProposalEvaluationContext context,
        out ProposalCandidate? candidate)
    {
        candidate = null;

        if (rule.RequiresIrrigatedField && !context.IsIrrigated)
        {
            return false;
        }

        if (rule.RequiredEventKind is { } eventKind)
        {
            if (!context.EventSignals.IsActive(eventKind))
            {
                return false;
            }
        }
        else if (rule.SourceType == ProposalSourceType.WeatherRule)
        {
            // Weather-rule proposals without an explicit event kind are not used for calendar alone.
            return false;
        }

        if (entry.IsPlantProtectionTreatment || rule.RequiresOfficialWarning)
        {
            // Never propose treatment from month/season alone.
            if (!rule.RequiresOfficialWarning && !rule.RequiresAgronomist)
            {
                return false;
            }

            if (rule.RequiresOfficialWarning
                && !context.ActiveWarnings.Any(w =>
                    w.IsActive
                    && (w.FieldIds.Count == 0 || w.FieldIds.Contains(context.FieldId))
                    && (w.TemplateCodes.Count == 0
                        || w.TemplateCodes.Contains(entry.Code, StringComparer.OrdinalIgnoreCase))))
            {
                return false;
            }
        }

        var monthRange = rule.CandidateMonthRange ?? entry.CandidateMonthRange;
        var isEventRule = rule.RequiredEventKind.HasValue
            || rule.SourceType is ProposalSourceType.WeatherRule or ProposalSourceType.OfficialWarning
                or ProposalSourceType.FieldObservation or ProposalSourceType.Agronomist;

        if (rule.SourceType == ProposalSourceType.SeasonalBaseline
            && !isEventRule
            && !CandidateWindowCalculator.Contains(monthRange, context.UtcNow, context.ResultYear))
        {
            return false;
        }

        var bbch = rule.RequiredBbchRange ?? entry.CandidateBbchRange;
        if (!BbchGate.Allows(bbch, context.Phenology, rule.AllowUnknownPhenology))
        {
            return false;
        }

        var window = CandidateWindowCalculator.Resolve(monthRange, context.ResultYear);
        var weather = context.HasWeatherData
            ? context.ObservedWeatherSuitability
            : WeatherSuitability.Unknown;

        // Missing weather must never be presented as Good.
        if (!context.HasWeatherData)
        {
            weather = WeatherSuitability.Unknown;
        }

        var (greek, english, confidence, reasons) = EnrichExplanation(entry, rule, context);

        candidate = new ProposalCandidate
        {
            TemplateCode = entry.Code,
            TemplateVersion = entry.Code.StartsWith('E')
                ? FieldWorkEventCatalogue.Version
                : FieldWorkCatalogue.Version,
            RuleCode = rule.RuleCode,
            SourceType = rule.SourceType,
            Confidence = confidence,
            GreekExplanation = greek,
            EnglishExplanation = english,
            ReasonCodes = reasons,
            SourceReference = ResolveSourceReference(rule, context),
            WindowStart = window?.Start ?? context.UtcNow.Date,
            WindowEnd = window?.End ?? context.UtcNow.Date.AddDays(7),
            WeatherSuitability = weather
        };
        return true;
    }

    private static (string Greek, string? English, ProposalConfidence Confidence, List<string> Reasons)
        EnrichExplanation(
            FieldWorkCatalogueEntry entry,
            CatalogueRule rule,
            ProposalEvaluationContext context)
    {
        var greek = rule.GreekExplanation;
        var english = rule.EnglishExplanation;
        var confidence = rule.DefaultConfidence;
        var reasons = rule.ReasonCodes.Count > 0 ? rule.ReasonCodes.ToList() : [rule.RuleCode];
        var signals = context.EventSignals;

        switch (rule.RequiredEventKind)
        {
            case FieldWorkEventKind.FrostInspection:
                if (signals.FrostUrgent)
                {
                    confidence = ProposalConfidence.StrongEvidence;
                    reasons = ["frost_urgent", .. reasons];
                }

                if (signals.ForecastMinTempC is { } minTemp)
                {
                    greek += $" Ελάχιστη πρόγνωση ~{minTemp:0.#}°C.";
                    english = (english ?? string.Empty) + $" Forecast minimum ~{minTemp:0.#}°C.";
                }

                break;
            case FieldWorkEventKind.StormInspection:
                if (signals.MaxGustKmh is { } gust)
                {
                    greek += $" Ριπές ~{gust:0} km/h.";
                    english = (english ?? string.Empty) + $" Gusts ~{gust:0} km/h.";
                }

                if (signals.StormRainMm is { } stormRain)
                {
                    greek += $" Βροχή ~{stormRain:0.#} mm.";
                    english = (english ?? string.Empty) + $" Rain ~{stormRain:0.#} mm.";
                }

                break;
            case FieldWorkEventKind.HeatInspection:
                if (signals.HeatUrgent)
                {
                    confidence = ProposalConfidence.StrongEvidence;
                    reasons = ["heat_urgent", .. reasons];
                }

                if (signals.ForecastMaxTempC is { } maxTemp)
                {
                    greek += $" Μέγιστη πρόγνωση ~{maxTemp:0.#}°C.";
                    english = (english ?? string.Empty) + $" Forecast maximum ~{maxTemp:0.#}°C.";
                }

                break;
            case FieldWorkEventKind.PostTreatmentRainReview:
                if (signals.PostTreatmentRainMm is { } treatRain)
                {
                    greek += $" Βροχή ~{treatRain:0.#} mm.";
                    english = (english ?? string.Empty) + $" Rain ~{treatRain:0.#} mm.";
                }

                if (signals.HoursBetweenTreatmentAndRain is { } treatHours)
                {
                    greek += $" Περίπου {treatHours:0.#} ώρες μετά την επέμβαση.";
                    english = (english ?? string.Empty)
                              + $" About {treatHours:0.#} hours after treatment.";
                }

                break;
            case FieldWorkEventKind.FertiliserHeavyRainReview:
                if (signals.FertiliserRainMm is { } fertRain)
                {
                    greek += $" Βροχή ~{fertRain:0.#} mm.";
                    english = (english ?? string.Empty) + $" Rain ~{fertRain:0.#} mm.";
                }

                if (signals.HoursBetweenFertilisationAndRain is { } fertHours)
                {
                    greek += $" Περίπου {fertHours:0.#} ώρες μετά τη λίπανση.";
                    english = (english ?? string.Empty)
                              + $" About {fertHours:0.#} hours after fertilisation.";
                }

                break;
        }

        return (greek, english, confidence, reasons);
    }

    private static string? ResolveSourceReference(CatalogueRule rule, ProposalEvaluationContext context) =>
        rule.RequiredEventKind switch
        {
            FieldWorkEventKind.PostTreatmentRainReview => context.EventSignals.PostTreatmentTaskId,
            FieldWorkEventKind.FertiliserHeavyRainReview => context.EventSignals.FertiliserTaskId,
            FieldWorkEventKind.SatelliteAnomalyReview => "satellite_anomaly",
            FieldWorkEventKind.FrostInspection => "frost_signal",
            FieldWorkEventKind.StormInspection => "storm_signal",
            FieldWorkEventKind.HeatInspection => "heat_signal",
            _ => rule.RuleCode
        };

    private static ProposalCandidate? FromWarning(
        FieldWorkCatalogueEntry entry,
        OfficialAgriculturalWarning warning,
        ProposalEvaluationContext context)
    {
        if (entry.IsPlantProtectionTreatment)
        {
            // Review eligibility only — explanation must not instruct spraying.
        }

        var monthRange = entry.CandidateMonthRange;
        var window = CandidateWindowCalculator.Resolve(monthRange, context.ResultYear);
        var weather = context.HasWeatherData
            ? context.ObservedWeatherSuitability
            : WeatherSuitability.Unknown;

        return new ProposalCandidate
        {
            TemplateCode = entry.Code,
            TemplateVersion = entry.Code.StartsWith('E')
                ? FieldWorkEventCatalogue.Version
                : FieldWorkCatalogue.Version,
            RuleCode = $"WARNING_{entry.Code}",
            SourceType = ProposalSourceType.OfficialWarning,
            Confidence = ProposalConfidence.StrongEvidence,
            GreekExplanation =
                $"Υπάρχει επίσημη προειδοποίηση για το χωράφι: {warning.Title}. Αξιολογήστε με προσοχή — δεν είναι αυτόματη διάγνωση.",
            EnglishExplanation =
                $"An official warning applies to this field: {warning.Title}. Review carefully — this is not an automatic diagnosis.",
            ReasonCodes = ["official_warning", entry.Code.ToLowerInvariant()],
            SourceReference = warning.SourceReference ?? warning.Id,
            WindowStart = window?.Start ?? warning.ValidFrom,
            WindowEnd = window?.End ?? warning.ValidUntil,
            WeatherSuitability = weather
        };
    }
}
