using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Core.FieldWork;

/// <summary>
/// Pure FieldWorkProfile eligibility for a catalogue template.
/// Never creates FieldTasks. Official/safety information is never suppressed by “I don’t …” preferences.
/// </summary>
public static class FieldWorkProfileEligibility
{
    public const int DefaultSoilAnalysisIntervalYears = 3;
    public const int DefaultLeafAnalysisIntervalYears = 1;
    public const int HarvestPrepLeadDays = 42;
    public const int PreHarvestReadinessLeadDays = 14;
    public const int DefaultHarvestStartMonth = 11;

    public static TemplateEligibilityResult EvaluateTemplateForField(TemplateEligibilityContext context)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(context.Entry);

        // Official / safety candidates override personalisation suppression.
        if (IsOfficialOrSafetyCandidate(context))
        {
            return TemplateEligibilityResult.Enabled(
                ReasonCodes.OfficialSafetyVisible,
                ProposalConfidence.StrongEvidence,
                isSafetyOrOfficialOverride: true);
        }

        var profile = context.Profile;
        if (profile is null || profile.Status != FieldWorkProfileStatus.Active)
        {
            return TemplateEligibilityResult.Enabled(ReasonCodes.NoActiveProfile, context.DefaultConfidence);
        }

        return ResolvePracticeCategory(context.Entry) switch
        {
            PracticeCategory.Pruning => EvaluatePruning(context, profile.Pruning),
            PracticeCategory.PruningResidue => EvaluatePruningResidue(context, profile.Pruning),
            PracticeCategory.Irrigation => EvaluateIrrigation(context, profile.Irrigation),
            PracticeCategory.FertilisationPlan => EvaluateFertilisationPlan(context, profile.Fertilisation),
            PracticeCategory.FertilisationApplication => EvaluateFertilisationApplication(context, profile.Fertilisation),
            PracticeCategory.GroundCover => EvaluateGroundCover(context, profile.GroundCover),
            PracticeCategory.PestMonitoring => EvaluatePestMonitoring(context, profile.PestManagement),
            PracticeCategory.PestTreatment => EvaluatePestTreatment(context, profile.PestManagement),
            PracticeCategory.SoilAnalysis => EvaluateAnalysis(context, profile.Analysis, AnalysisKind.Soil),
            PracticeCategory.LeafAnalysis => EvaluateAnalysis(context, profile.Analysis, AnalysisKind.Leaf),
            PracticeCategory.HarvestPrep => EvaluateHarvestLead(
                context, profile.Harvest, HarvestPrepLeadDays, ReasonCodes.HarvestPrepOutsideWindow),
            PracticeCategory.PreHarvestReadiness => EvaluateHarvestLead(
                context, profile.Harvest, PreHarvestReadinessLeadDays, ReasonCodes.PreHarvestOutsideWindow),
            _ => TemplateEligibilityResult.Enabled(ReasonCodes.NotPersonalised, context.DefaultConfidence)
        };
    }

    /// <summary>
    /// Whether the field should be treated as irrigated for proposal rules when an Active profile exists.
    /// </summary>
    public static bool ResolveIsIrrigated(bool fieldIrrigationStatus, FieldWorkProfile? profile)
    {
        if (profile is null || profile.Status != FieldWorkProfileStatus.Active)
        {
            return fieldIrrigationStatus;
        }

        return profile.Irrigation.PreferenceMode switch
        {
            PreferenceMode.Disabled => false,
            PreferenceMode.Enabled => true,
            PreferenceMode.AskFirst => fieldIrrigationStatus,
            PreferenceMode.DecidedByProfessional => fieldIrrigationStatus,
            _ => fieldIrrigationStatus
        };
    }

    public static PracticeCategory ResolvePracticeCategory(string templateCode) =>
        ResolvePracticeCategory(FieldWorkCatalogue.GetByCode(templateCode)
            ?? new FieldWorkCatalogueEntry
            {
                Code = templateCode,
                GreekName = templateCode,
                EnglishName = templateCode,
                Category = "Other"
            });

    public static PracticeCategory ResolvePracticeCategory(FieldWorkCatalogueEntry entry) =>
        entry.Code.ToUpperInvariant() switch
        {
            "T06" => PracticeCategory.Pruning,
            "T07" => PracticeCategory.PruningResidue,
            "T08" or "T15" => PracticeCategory.Irrigation,
            "T04" => PracticeCategory.FertilisationPlan,
            "T05" => PracticeCategory.FertilisationApplication,
            "T09" => PracticeCategory.GroundCover,
            "T03" => PracticeCategory.SoilAnalysis,
            "T16" => PracticeCategory.LeafAnalysis,
            "T11" or "T12" or "T13" or "T14" => PracticeCategory.PestMonitoring,
            "T19" => PracticeCategory.HarvestPrep,
            "T20" => PracticeCategory.PreHarvestReadiness,
            _ when entry.IsPlantProtectionTreatment => PracticeCategory.PestTreatment,
            _ => PracticeCategory.Other
        };

    private static TemplateEligibilityResult EvaluatePruning(
        TemplateEligibilityContext context,
        PruningProfile pruning)
    {
        if (IsCurrentYearWorkComplete(context, "pruning", "T06"))
        {
            return SuppressedDuplicate(context.ResultYear);
        }

        if (pruning.PreferenceMode == PreferenceMode.DecidedByProfessional)
        {
            return TemplateEligibilityResult.AskFirst(
                ReasonCodes.PruningAgronomistReview,
                ProposalConfidence.WorthChecking,
                nextEligibleYear: NextYearFromInterval(pruning, context.ResultYear));
        }

        if (pruning.FrequencyType == FrequencyType.WhenNeeded
            || pruning.PreferenceMode == PreferenceMode.AskFirst && pruning.FrequencyType == FrequencyType.WhenNeeded)
        {
            if (!HasNonCalendarEvidence(context))
            {
                return TemplateEligibilityResult.Suppressed(
                    ReasonCodes.PruningNeedsEvidence,
                    ProposalConfidence.WorthChecking);
            }

            return TemplateEligibilityResult.Enabled(
                ReasonCodes.PruningEvidencePresent,
                ProposalConfidence.WorthChecking);
        }

        if (pruning.PreferenceMode == PreferenceMode.Unknown
            || pruning.FrequencyType == FrequencyType.Unknown)
        {
            return TemplateEligibilityResult.Enabled(
                ReasonCodes.PruningUnknownWorthChecking,
                ProposalConfidence.WorthChecking);
        }

        if (pruning.FrequencyType == FrequencyType.EveryNYears)
        {
            var interval = pruning.FrequencyValue;
            if (interval is null or < 1)
            {
                // Every 3+ without configured interval → AskFirst, do not assume 3.
                return TemplateEligibilityResult.AskFirst(
                    ReasonCodes.PruningIntervalUnconfigured,
                    ProposalConfidence.WorthChecking);
            }

            var last = pruning.LastPerformedYear;
            if (last.HasValue)
            {
                var next = last.Value + interval.Value;
                if (context.ResultYear < next)
                {
                    return TemplateEligibilityResult.Suppressed(
                        ReasonCodes.PruningNotDueThisYear,
                        ProposalConfidence.SeasonalReminder,
                        nextEligibleYear: next);
                }

                return TemplateEligibilityResult.Enabled(
                    ReasonCodes.PruningDueThisYear,
                    ProposalConfidence.SeasonalReminder,
                    nextEligibleYear: context.ResultYear + interval.Value);
            }
        }

        if (pruning.FrequencyType == FrequencyType.TimesPerYear
            || (pruning.FrequencyType == FrequencyType.EveryNYears && pruning.FrequencyValue == 1))
        {
            var last = pruning.LastPerformedYear;
            if (last.HasValue)
            {
                var next = last.Value + 1;
                if (context.ResultYear < next)
                {
                    return TemplateEligibilityResult.Suppressed(
                        ReasonCodes.PruningNotDueThisYear,
                        ProposalConfidence.SeasonalReminder,
                        nextEligibleYear: next);
                }

                return TemplateEligibilityResult.Enabled(
                    ReasonCodes.PruningDueThisYear,
                    ProposalConfidence.SeasonalReminder,
                    nextEligibleYear: next);
            }

            return TemplateEligibilityResult.Enabled(
                ReasonCodes.PruningDueThisYear,
                ProposalConfidence.SeasonalReminder,
                nextEligibleYear: context.ResultYear + 1);
        }

        if (pruning.PreferenceMode == PreferenceMode.Disabled)
        {
            return TemplateEligibilityResult.Suppressed(
                ReasonCodes.PruningDisabled,
                ProposalConfidence.WorthChecking);
        }

        return TemplateEligibilityResult.Enabled(ReasonCodes.PruningDueThisYear, context.DefaultConfidence);
    }

    private static TemplateEligibilityResult EvaluatePruningResidue(
        TemplateEligibilityContext context,
        PruningProfile pruning)
    {
        // Residue follow-up only when pruning itself is enabled / ask-first for this year.
        var pruningResult = EvaluatePruning(context, pruning);
        if (pruningResult.Status == TemplateEligibilityStatus.Suppressed
            && pruningResult.ReasonCode is ReasonCodes.PruningNotDueThisYear
                or ReasonCodes.PruningNeedsEvidence
                or ReasonCodes.PruningDisabled
                or ReasonCodes.AlreadyCompletedThisYear)
        {
            return TemplateEligibilityResult.Suppressed(
                ReasonCodes.PruningResidueSuppressed,
                ProposalConfidence.WorthChecking,
                nextEligibleYear: pruningResult.NextEligibleYear);
        }

        return TemplateEligibilityResult.Enabled(ReasonCodes.NotPersonalised, context.DefaultConfidence);
    }

    private static TemplateEligibilityResult EvaluateIrrigation(
        TemplateEligibilityContext context,
        IrrigationProfile irrigation)
    {
        if (IsCurrentYearWorkComplete(context, "irrigation", context.Entry.Code))
        {
            return SuppressedDuplicate(context.ResultYear);
        }

        switch (irrigation.PreferenceMode)
        {
            case PreferenceMode.Disabled:
                // Rain-fed: suppress recurring irrigation proposals (system check + scheduling).
                return TemplateEligibilityResult.Suppressed(
                    ReasonCodes.IrrigationRainFed,
                    ProposalConfidence.WorthChecking);

            case PreferenceMode.AskFirst:
                return TemplateEligibilityResult.AskFirst(
                    ReasonCodes.IrrigationAskFirst,
                    ProposalConfidence.WorthChecking);

            case PreferenceMode.Unknown:
                // Low-confidence inspection only — suppress recurring scheduling (T15), allow T08 as worth-checking.
                if (string.Equals(context.Entry.Code, "T15", StringComparison.OrdinalIgnoreCase))
                {
                    return TemplateEligibilityResult.Suppressed(
                        ReasonCodes.IrrigationUnknownNoRecurring,
                        ProposalConfidence.WorthChecking);
                }

                return TemplateEligibilityResult.Enabled(
                    ReasonCodes.IrrigationUnknownInspection,
                    ProposalConfidence.WorthChecking);

            case PreferenceMode.DecidedByProfessional:
                return TemplateEligibilityResult.AskFirst(
                    ReasonCodes.IrrigationAgronomist,
                    ProposalConfidence.WorthChecking);

            case PreferenceMode.Enabled:
                return TemplateEligibilityResult.Enabled(
                    ReasonCodes.IrrigationEnabled,
                    context.DefaultConfidence);

            default:
                return TemplateEligibilityResult.Enabled(ReasonCodes.NotPersonalised, context.DefaultConfidence);
        }
    }

    private static TemplateEligibilityResult EvaluateFertilisationPlan(
        TemplateEligibilityContext context,
        FertilisationProfile fert)
    {
        if (fert.PreferenceMode == PreferenceMode.Disabled)
        {
            // Keep nutrient-deficiency inspection information elsewhere; suppress plan as generic work.
            return TemplateEligibilityResult.Suppressed(
                ReasonCodes.FertilisationDisabled,
                ProposalConfidence.WorthChecking);
        }

        if (fert.PreferenceMode == PreferenceMode.Unknown)
        {
            return TemplateEligibilityResult.Enabled(
                ReasonCodes.FertilisationUnknownReview,
                ProposalConfidence.WorthChecking);
        }

        if (fert.PreferenceMode == PreferenceMode.DecidedByProfessional
            || fert.DecisionMaker == WorkDecisionMaker.Agronomist)
        {
            return TemplateEligibilityResult.AskFirst(
                ReasonCodes.FertilisationAgronomistReview,
                ProposalConfidence.WorthChecking);
        }

        if (fert.FrequencyType == FrequencyType.EvidenceOnly)
        {
            return TemplateEligibilityResult.Enabled(
                ReasonCodes.FertilisationPlanWithEvidencePreference,
                ProposalConfidence.WorthChecking);
        }

        if (fert.PreferenceMode == PreferenceMode.AskFirst
            || fert.FrequencyType is FrequencyType.WhenNeeded)
        {
            return TemplateEligibilityResult.AskFirst(
                ReasonCodes.FertilisationAskFirst,
                ProposalConfidence.WorthChecking);
        }

        return TemplateEligibilityResult.Enabled(ReasonCodes.FertilisationPlanEnabled, context.DefaultConfidence);
    }

    private static TemplateEligibilityResult EvaluateFertilisationApplication(
        TemplateEligibilityContext context,
        FertilisationProfile fert)
    {
        if (IsCurrentYearWorkComplete(context, "fertilisation", "T05"))
        {
            var preferred = fert.FrequencyType == FrequencyType.TimesPerYear
                ? Math.Max(1, fert.FrequencyValue ?? 1)
                : 1;
            var completed = CountCompleted(context, "fertilisation", "T05");
            var remaining = Math.Max(0, preferred - completed);
            if (remaining == 0)
            {
                return TemplateEligibilityResult.Suppressed(
                    ReasonCodes.AlreadyCompletedThisYear,
                    ProposalConfidence.SeasonalReminder,
                    remainingExpectedInstances: 0);
            }
        }

        if (fert.PreferenceMode == PreferenceMode.Disabled)
        {
            return TemplateEligibilityResult.Suppressed(
                ReasonCodes.FertilisationDisabled,
                ProposalConfidence.WorthChecking);
        }

        if (fert.FrequencyType == FrequencyType.EvidenceOnly
            || fert.PreferenceMode == PreferenceMode.AskFirst && fert.FrequencyType == FrequencyType.EvidenceOnly)
        {
            if (!HasFertilisationEvidence(context))
            {
                return TemplateEligibilityResult.Suppressed(
                    ReasonCodes.FertilisationNeedsEvidence,
                    ProposalConfidence.WorthChecking);
            }

            return TemplateEligibilityResult.Enabled(
                ReasonCodes.FertilisationEvidencePresent,
                ProposalConfidence.WorthChecking);
        }

        if (fert.PreferenceMode == PreferenceMode.DecidedByProfessional
            || fert.DecisionMaker == WorkDecisionMaker.Agronomist)
        {
            return TemplateEligibilityResult.AskFirst(
                ReasonCodes.FertilisationAgronomistReview,
                ProposalConfidence.WorthChecking);
        }

        if (fert.PreferenceMode == PreferenceMode.AskFirst
            || fert.FrequencyType == FrequencyType.WhenNeeded)
        {
            if (!HasFertilisationEvidence(context) && IsCalendarOnly(context))
            {
                return TemplateEligibilityResult.AskFirst(
                    ReasonCodes.FertilisationAskFirst,
                    ProposalConfidence.WorthChecking);
            }

            return TemplateEligibilityResult.AskFirst(
                ReasonCodes.FertilisationAskFirst,
                ProposalConfidence.WorthChecking);
        }

        if (fert.PreferenceMode == PreferenceMode.Unknown)
        {
            return TemplateEligibilityResult.Enabled(
                ReasonCodes.FertilisationUnknownReview,
                ProposalConfidence.WorthChecking);
        }

        if (fert.FrequencyType == FrequencyType.TimesPerYear || fert.PreferenceMode == PreferenceMode.Enabled)
        {
            var preferred = Math.Max(1, fert.FrequencyValue ?? 1);
            var completed = CountCompleted(context, "fertilisation", "T05");
            var remaining = Math.Max(0, preferred - completed);
            if (remaining == 0)
            {
                return TemplateEligibilityResult.Suppressed(
                    ReasonCodes.AlreadyCompletedThisYear,
                    ProposalConfidence.SeasonalReminder,
                    remainingExpectedInstances: 0);
            }

            return TemplateEligibilityResult.Enabled(
                ReasonCodes.FertilisationApplicationEnabled,
                context.DefaultConfidence,
                remainingExpectedInstances: remaining);
        }

        return TemplateEligibilityResult.Enabled(ReasonCodes.FertilisationApplicationEnabled, context.DefaultConfidence);
    }

    private static TemplateEligibilityResult EvaluateGroundCover(
        TemplateEligibilityContext context,
        GroundCoverProfile ground)
    {
        if (ground.Methods.Contains(GroundCoverMethod.NoFixedClearing)
            && ground.FrequencyType is FrequencyType.Unknown or FrequencyType.WhenNeeded)
        {
            if (!HasNonCalendarEvidence(context))
            {
                return TemplateEligibilityResult.Suppressed(
                    ReasonCodes.GroundCoverNoFixedClearing,
                    ProposalConfidence.WorthChecking,
                    remainingExpectedInstances: 0);
            }
        }

        if (ground.FrequencyType == FrequencyType.WhenNeeded)
        {
            if (!HasNonCalendarEvidence(context))
            {
                return TemplateEligibilityResult.Suppressed(
                    ReasonCodes.GroundCoverNeedsEvidence,
                    ProposalConfidence.WorthChecking);
            }

            return TemplateEligibilityResult.Enabled(
                ReasonCodes.GroundCoverEvidencePresent,
                ProposalConfidence.WorthChecking);
        }

        if (ground.PreferenceMode == PreferenceMode.Disabled)
        {
            return TemplateEligibilityResult.Suppressed(
                ReasonCodes.GroundCoverDisabled,
                ProposalConfidence.WorthChecking,
                remainingExpectedInstances: 0);
        }

        if (ground.FrequencyType == FrequencyType.TimesPerYear
            || ground.PreferenceMode == PreferenceMode.Enabled)
        {
            var preferred = Math.Max(0, ground.FrequencyValue ?? 1);
            var completed = CountCompleted(context, "ground_cover", "T09");
            var remaining = Math.Max(0, preferred - completed);
            if (remaining == 0)
            {
                return TemplateEligibilityResult.Suppressed(
                    ReasonCodes.GroundCoverQuotaMet,
                    ProposalConfidence.SeasonalReminder,
                    remainingExpectedInstances: 0);
            }

            return TemplateEligibilityResult.Enabled(
                ReasonCodes.GroundCoverRemaining,
                context.DefaultConfidence,
                remainingExpectedInstances: remaining);
        }

        if (ground.PreferenceMode == PreferenceMode.AskFirst)
        {
            return TemplateEligibilityResult.AskFirst(
                ReasonCodes.GroundCoverAskFirst,
                ProposalConfidence.WorthChecking);
        }

        return TemplateEligibilityResult.Enabled(ReasonCodes.NotPersonalised, context.DefaultConfidence);
    }

    private static TemplateEligibilityResult EvaluatePestMonitoring(
        TemplateEligibilityContext context,
        PestManagementProfile pest)
    {
        if (pest.DecisionApproach == PestDecisionApproach.NoUsualTreatments)
        {
            // Monitoring / inspection may continue as worth-checking information.
            return TemplateEligibilityResult.Enabled(
                ReasonCodes.PestMonitoringKeptAsInformation,
                ProposalConfidence.WorthChecking);
        }

        if (pest.DecisionApproach == PestDecisionApproach.Agronomist)
        {
            return TemplateEligibilityResult.AskFirst(
                ReasonCodes.PestAgronomistDecision,
                ProposalConfidence.WorthChecking);
        }

        if (pest.DecisionApproach == PestDecisionApproach.Unknown)
        {
            return TemplateEligibilityResult.AskFirst(
                ReasonCodes.PestUnknownAskFirst,
                ProposalConfidence.WorthChecking);
        }

        if (pest.DecisionApproach is PestDecisionApproach.TrapAndFruitChecks or PestDecisionApproach.Combined
            && pest.TrapStatus == TrapStatus.None
            && string.Equals(context.Entry.Code, "T13", StringComparison.OrdinalIgnoreCase))
        {
            return TemplateEligibilityResult.AskFirst(
                ReasonCodes.PestTrapsNotInstalled,
                ProposalConfidence.WorthChecking);
        }

        return TemplateEligibilityResult.Enabled(ReasonCodes.PestMonitoringEnabled, context.DefaultConfidence);
    }

    private static TemplateEligibilityResult EvaluatePestTreatment(
        TemplateEligibilityContext context,
        PestManagementProfile pest)
    {
        // Official/safety already short-circuited above. Generic treatments may be suppressed.
        if (pest.DecisionApproach == PestDecisionApproach.NoUsualTreatments
            || pest.PreferenceMode == PreferenceMode.Disabled)
        {
            return TemplateEligibilityResult.Suppressed(
                ReasonCodes.PestTreatmentSuppressed,
                ProposalConfidence.WorthChecking);
        }

        if (pest.DecisionApproach == PestDecisionApproach.Agronomist)
        {
            return TemplateEligibilityResult.AskFirst(
                ReasonCodes.PestAgronomistDecision,
                ProposalConfidence.WorthChecking);
        }

        return TemplateEligibilityResult.Enabled(ReasonCodes.NotPersonalised, context.DefaultConfidence);
    }

    private static TemplateEligibilityResult EvaluateAnalysis(
        TemplateEligibilityContext context,
        AnalysisProfile analysis,
        AnalysisKind kind)
    {
        if (analysis.PreferenceMode == PreferenceMode.Disabled)
        {
            return TemplateEligibilityResult.Suppressed(
                ReasonCodes.AnalysisDisabled,
                ProposalConfidence.WorthChecking);
        }

        if (analysis.Kinds.Count > 0 && analysis.Kinds.All(k => k.Kind != kind))
        {
            return TemplateEligibilityResult.Suppressed(
                ReasonCodes.AnalysisDisabled,
                ProposalConfidence.WorthChecking);
        }

        var entry = analysis.Kinds.FirstOrDefault(k => k.Kind == kind);
        var last = entry?.LastPerformedYear ?? analysis.LastPerformedYear;
        var interval = analysis.FrequencyType == FrequencyType.EveryNYears && analysis.FrequencyValue is > 0
            ? analysis.FrequencyValue.Value
            : kind == AnalysisKind.Soil
                ? DefaultSoilAnalysisIntervalYears
                : DefaultLeafAnalysisIntervalYears;

        if (last.HasValue)
        {
            var next = last.Value + interval;
            if (context.ResultYear < next)
            {
                return TemplateEligibilityResult.Suppressed(
                    ReasonCodes.AnalysisNotDue,
                    ProposalConfidence.WorthChecking,
                    nextEligibleYear: next);
            }

            return TemplateEligibilityResult.Enabled(
                ReasonCodes.AnalysisDue,
                ProposalConfidence.WorthChecking,
                nextEligibleYear: context.ResultYear + interval);
        }

        if (analysis.PreferenceMode == PreferenceMode.Unknown)
        {
            return TemplateEligibilityResult.Enabled(
                ReasonCodes.AnalysisUnknownWorthChecking,
                ProposalConfidence.WorthChecking);
        }

        return TemplateEligibilityResult.Enabled(
            ReasonCodes.AnalysisDue,
            ProposalConfidence.WorthChecking,
            nextEligibleYear: context.ResultYear + interval);
    }

    private static TemplateEligibilityResult EvaluateHarvestLead(
        TemplateEligibilityContext context,
        HarvestProfile harvest,
        int leadDays,
        string outsideWindowReason)
    {
        var month = harvest.ExpectedStartMonth is >= 1 and <= 12
            ? harvest.ExpectedStartMonth.Value
            : DefaultHarvestStartMonth;

        // Expected start is the 1st of the configured month in the ResultYear.
        // January harvest continues prior ResultYear via ResultYearResolver elsewhere — month still attaches here.
        var expectedStart = new DateTime(context.ResultYear, month, 1, 0, 0, 0, DateTimeKind.Utc);
        if (month == 1)
        {
            // Harvest in January belongs to previous calendar year's ResultYear window end.
            expectedStart = new DateTime(context.ResultYear + 1, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        }

        var windowOpen = expectedStart.AddDays(-leadDays);
        var athens = AthensTime.CalendarDate(context.UtcNow);
        var openDate = AthensTime.CalendarDate(windowOpen);
        var startDate = AthensTime.CalendarDate(expectedStart);

        if (athens < openDate || athens > startDate.AddDays(7))
        {
            return TemplateEligibilityResult.Suppressed(
                outsideWindowReason,
                ProposalConfidence.WorthChecking,
                nextEligibleYear: context.ResultYear);
        }

        return TemplateEligibilityResult.Enabled(
            leadDays == HarvestPrepLeadDays
                ? ReasonCodes.HarvestPrepInWindow
                : ReasonCodes.PreHarvestInWindow,
            ProposalConfidence.WorthChecking);
    }

    private static TemplateEligibilityResult SuppressedDuplicate(int resultYear) =>
        TemplateEligibilityResult.Suppressed(
            ReasonCodes.AlreadyCompletedThisYear,
            ProposalConfidence.SeasonalReminder,
            remainingExpectedInstances: 0);

    private static bool IsOfficialOrSafetyCandidate(TemplateEligibilityContext context)
    {
        if (context.CandidateSourceType == ProposalSourceType.OfficialWarning)
        {
            return true;
        }

        if (context.TreatAsOfficialOrSafetyInformation)
        {
            return true;
        }

        return context.ActiveWarnings.Any(w =>
            w.IsActive
            && (w.FieldIds.Count == 0 || w.FieldIds.Contains(context.FieldId, StringComparer.Ordinal))
            && (w.TemplateCodes.Count == 0
                || w.TemplateCodes.Contains(context.Entry.Code, StringComparer.OrdinalIgnoreCase)));
    }

    private static bool HasNonCalendarEvidence(TemplateEligibilityContext context)
    {
        if (context.CandidateSourceType is ProposalSourceType.FieldObservation
            or ProposalSourceType.WeatherRule
            or ProposalSourceType.OfficialWarning
            or ProposalSourceType.Agronomist)
        {
            return true;
        }

        if (context.HasObservationEvidence || context.HasAgronomistEvidence)
        {
            return true;
        }

        var signals = context.EventSignals;
        return signals.FrostUrgent
               || signals.HeatUrgent
               || signals.IsActive(FieldWorkEventKind.FrostInspection)
               || signals.IsActive(FieldWorkEventKind.StormInspection)
               || signals.IsActive(FieldWorkEventKind.HeatInspection)
               || signals.IsActive(FieldWorkEventKind.SatelliteAnomalyReview);
    }

    private static bool HasFertilisationEvidence(TemplateEligibilityContext context) =>
        context.HasAnalysisEvidence
        || context.HasAgronomistEvidence
        || HasNonCalendarEvidence(context)
        || context.EventSignals.IsActive(FieldWorkEventKind.FertiliserHeavyRainReview);

    private static bool IsCalendarOnly(TemplateEligibilityContext context) =>
        context.CandidateSourceType is null or ProposalSourceType.SeasonalBaseline;

    private static bool IsCurrentYearWorkComplete(
        TemplateEligibilityContext context,
        string category,
        string templateCode)
    {
        if (CountCompleted(context, category, templateCode) > 0
            && context.Entry.Code.Equals(templateCode, StringComparison.OrdinalIgnoreCase))
        {
            // For multi-instance categories, Evaluate* methods check remaining; single-instance uses this.
            if (ResolvePracticeCategory(context.Entry) is PracticeCategory.GroundCover
                or PracticeCategory.FertilisationApplication)
            {
                return false;
            }

            return true;
        }

        return context.Profile?.CurrentYearDeclaredWork.Any(d =>
                   d.ResultYear == context.ResultYear
                   && d.Completion is DeclaredWorkCompletion.Yes
                   && (string.Equals(d.TemplateCode, templateCode, StringComparison.OrdinalIgnoreCase)
                       || (string.IsNullOrEmpty(d.TemplateCode)
                           && string.Equals(d.Category, category, StringComparison.OrdinalIgnoreCase))))
               == true
               && ResolvePracticeCategory(context.Entry) is not PracticeCategory.GroundCover
                   and not PracticeCategory.FertilisationApplication;
    }

    private static int CountCompleted(
        TemplateEligibilityContext context,
        string category,
        string templateCode)
    {
        var fromExecutions = 0;
        if (context.CompletedCountsByTemplate.TryGetValue(templateCode, out var byCode))
        {
            fromExecutions = byCode;
        }

        var declared = context.Profile?.CurrentYearDeclaredWork.Count(d =>
            d.ResultYear == context.ResultYear
            && d.Completion is DeclaredWorkCompletion.Yes or DeclaredWorkCompletion.Partially
            && (string.Equals(d.TemplateCode, templateCode, StringComparison.OrdinalIgnoreCase)
                || (string.IsNullOrEmpty(d.TemplateCode)
                    && string.Equals(d.Category, category, StringComparison.OrdinalIgnoreCase)))) ?? 0;

        // Partially counts as one instance toward the quota.
        return fromExecutions + declared;
    }

    private static int? NextYearFromInterval(PruningProfile pruning, int resultYear)
    {
        if (pruning.LastPerformedYear is { } last
            && pruning.FrequencyType == FrequencyType.EveryNYears
            && pruning.FrequencyValue is > 0)
        {
            return last + pruning.FrequencyValue.Value;
        }

        return resultYear + (pruning.FrequencyValue ?? 1);
    }
}

public enum PracticeCategory
{
    Other,
    Pruning,
    PruningResidue,
    Irrigation,
    FertilisationPlan,
    FertilisationApplication,
    GroundCover,
    PestMonitoring,
    PestTreatment,
    SoilAnalysis,
    LeafAnalysis,
    HarvestPrep,
    PreHarvestReadiness
}

public sealed class TemplateEligibilityContext
{
    public required FieldWorkCatalogueEntry Entry { get; init; }
    public required string FieldId { get; init; }
    public FieldWorkProfile? Profile { get; init; }
    public required int ResultYear { get; init; }
    public required DateTime UtcNow { get; init; }
    public ProposalConfidence DefaultConfidence { get; init; } = ProposalConfidence.SeasonalReminder;
    public ProposalSourceType? CandidateSourceType { get; init; }
    public bool TreatAsOfficialOrSafetyInformation { get; init; }
    public IReadOnlyList<OfficialAgriculturalWarning> ActiveWarnings { get; init; } = [];
    public FieldWorkEventSignals EventSignals { get; init; } = new();
    public IReadOnlyDictionary<string, int> CompletedCountsByTemplate { get; init; } =
        new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
    public bool HasAnalysisEvidence { get; init; }
    public bool HasObservationEvidence { get; init; }
    public bool HasAgronomistEvidence { get; init; }
}

public sealed class TemplateEligibilityResult
{
    public required TemplateEligibilityStatus Status { get; init; }
    public required string ReasonCode { get; init; }
    public int? NextEligibleYear { get; init; }
    public int? RemainingExpectedInstances { get; init; }
    public ProposalConfidence Confidence { get; init; } = ProposalConfidence.SeasonalReminder;
    public bool IsSafetyOrOfficialOverride { get; init; }

    public string GreekReason => FieldWorkProfileEligibilityLabels.ForReason(ReasonCode, "el");
    public string EnglishReason => FieldWorkProfileEligibilityLabels.ForReason(ReasonCode, "en");

    public static TemplateEligibilityResult Enabled(
        string reasonCode,
        ProposalConfidence confidence,
        int? nextEligibleYear = null,
        int? remainingExpectedInstances = null,
        bool isSafetyOrOfficialOverride = false) => new()
    {
        Status = TemplateEligibilityStatus.Enabled,
        ReasonCode = reasonCode,
        Confidence = confidence,
        NextEligibleYear = nextEligibleYear,
        RemainingExpectedInstances = remainingExpectedInstances,
        IsSafetyOrOfficialOverride = isSafetyOrOfficialOverride
    };

    public static TemplateEligibilityResult Suppressed(
        string reasonCode,
        ProposalConfidence confidence,
        int? nextEligibleYear = null,
        int? remainingExpectedInstances = null) => new()
    {
        Status = TemplateEligibilityStatus.Suppressed,
        ReasonCode = reasonCode,
        Confidence = confidence,
        NextEligibleYear = nextEligibleYear,
        RemainingExpectedInstances = remainingExpectedInstances
    };

    public static TemplateEligibilityResult AskFirst(
        string reasonCode,
        ProposalConfidence confidence,
        int? nextEligibleYear = null,
        int? remainingExpectedInstances = null) => new()
    {
        Status = TemplateEligibilityStatus.AskFirst,
        ReasonCode = reasonCode,
        Confidence = confidence,
        NextEligibleYear = nextEligibleYear,
        RemainingExpectedInstances = remainingExpectedInstances
    };
}

/// <summary>Stable reason codes — user-facing text lives in <see cref="FieldWorkProfileEligibilityLabels"/>.</summary>
public static class ReasonCodes
{
    public const string NoActiveProfile = "no_active_profile";
    public const string NotPersonalised = "not_personalised";
    public const string OfficialSafetyVisible = "official_safety_visible";
    public const string AlreadyCompletedThisYear = "already_completed_this_year";

    public const string PruningNotDueThisYear = "pruning_not_due_this_year";
    public const string PruningDueThisYear = "pruning_due_this_year";
    public const string PruningNeedsEvidence = "pruning_needs_evidence";
    public const string PruningEvidencePresent = "pruning_evidence_present";
    public const string PruningAgronomistReview = "pruning_agronomist_review";
    public const string PruningUnknownWorthChecking = "pruning_unknown_worth_checking";
    public const string PruningIntervalUnconfigured = "pruning_interval_unconfigured";
    public const string PruningDisabled = "pruning_disabled";
    public const string PruningResidueSuppressed = "pruning_residue_suppressed";

    public const string IrrigationRainFed = "irrigation_rain_fed";
    public const string IrrigationAskFirst = "irrigation_ask_first";
    public const string IrrigationUnknownNoRecurring = "irrigation_unknown_no_recurring";
    public const string IrrigationUnknownInspection = "irrigation_unknown_inspection";
    public const string IrrigationAgronomist = "irrigation_agronomist";
    public const string IrrigationEnabled = "irrigation_enabled";

    public const string FertilisationDisabled = "fertilisation_disabled";
    public const string FertilisationNeedsEvidence = "fertilisation_needs_evidence";
    public const string FertilisationEvidencePresent = "fertilisation_evidence_present";
    public const string FertilisationAgronomistReview = "fertilisation_agronomist_review";
    public const string FertilisationAskFirst = "fertilisation_ask_first";
    public const string FertilisationUnknownReview = "fertilisation_unknown_review";
    public const string FertilisationPlanEnabled = "fertilisation_plan_enabled";
    public const string FertilisationPlanWithEvidencePreference = "fertilisation_plan_evidence_preference";
    public const string FertilisationApplicationEnabled = "fertilisation_application_enabled";

    public const string GroundCoverQuotaMet = "ground_cover_quota_met";
    public const string GroundCoverRemaining = "ground_cover_remaining";
    public const string GroundCoverNeedsEvidence = "ground_cover_needs_evidence";
    public const string GroundCoverEvidencePresent = "ground_cover_evidence_present";
    public const string GroundCoverNoFixedClearing = "ground_cover_no_fixed_clearing";
    public const string GroundCoverDisabled = "ground_cover_disabled";
    public const string GroundCoverAskFirst = "ground_cover_ask_first";

    public const string PestTreatmentSuppressed = "pest_treatment_suppressed";
    public const string PestMonitoringKeptAsInformation = "pest_monitoring_kept_as_information";
    public const string PestAgronomistDecision = "pest_agronomist_decision";
    public const string PestUnknownAskFirst = "pest_unknown_ask_first";
    public const string PestTrapsNotInstalled = "pest_traps_not_installed";
    public const string PestMonitoringEnabled = "pest_monitoring_enabled";

    public const string AnalysisDisabled = "analysis_disabled";
    public const string AnalysisNotDue = "analysis_not_due";
    public const string AnalysisDue = "analysis_due";
    public const string AnalysisUnknownWorthChecking = "analysis_unknown_worth_checking";

    public const string HarvestPrepOutsideWindow = "harvest_prep_outside_window";
    public const string HarvestPrepInWindow = "harvest_prep_in_window";
    public const string PreHarvestOutsideWindow = "pre_harvest_outside_window";
    public const string PreHarvestInWindow = "pre_harvest_in_window";
}

/// <summary>Human-readable Greek/English eligibility reasons — no rule-engine jargon.</summary>
public static class FieldWorkProfileEligibilityLabels
{
    public static string ForReason(string reasonCode, string language = "el")
    {
        var en = language.StartsWith("en", StringComparison.OrdinalIgnoreCase);
        return reasonCode switch
        {
            ReasonCodes.NoActiveProfile => en
                ? "No active work profile yet — using the seasonal plan."
                : "Δεν υπάρχει ακόμη ενεργό προφίλ εργασίας — χρησιμοποιείται το εποχικό σχέδιο.",
            ReasonCodes.NotPersonalised => en
                ? "This work is not personalised for this field."
                : "Αυτή η εργασία δεν έχει προσωποποίηση για το χωράφι.",
            ReasonCodes.OfficialSafetyVisible => en
                ? "Official or safety information stays visible even when you skip this kind of work."
                : "Οι επίσημες ή πληροφορίες ασφαλείας παραμένουν ορατές ακόμα κι αν δεν κάνετε αυτή την εργασία.",
            ReasonCodes.AlreadyCompletedThisYear => en
                ? "This work was already recorded for this result year."
                : "Αυτή η εργασία έχει ήδη καταγραφεί για τη φετινή χρονιά αποτελεσμάτων.",

            ReasonCodes.PruningNotDueThisYear => en
                ? "Pruning is not due this year based on how often you prune."
                : "Το κλάδεμα δεν προβλέπεται φέτος με βάση τη συχνότητα που δηλώσατε.",
            ReasonCodes.PruningDueThisYear => en
                ? "Pruning is due this year based on your usual interval."
                : "Το κλάδεμα προβλέπεται φέτος με βάση τη συνήθη συχνότητά σας.",
            ReasonCodes.PruningNeedsEvidence => en
                ? "Pruning is only suggested when there is a field reason to check."
                : "Το κλάδεμα προτείνεται μόνο όταν υπάρχει ένδειξη από το χωράφι.",
            ReasonCodes.PruningEvidencePresent => en
                ? "There is a field reason to review pruning."
                : "Υπάρχει ένδειξη από το χωράφι για ανασκόπηση κλαδέματος.",
            ReasonCodes.PruningAgronomistReview => en
                ? "Review pruning with your agronomist or collaborator — not an instruction to prune now."
                : "Ανασκοπήστε το κλάδεμα με τον γεωπόνο ή συνεργάτη σας — όχι εντολή «κλαδέψτε τώρα».",
            ReasonCodes.PruningUnknownWorthChecking => en
                ? "Pruning may be worth checking this season."
                : "Το κλάδεμα αξίζει έναν έλεγχο αυτή την εποχή.",
            ReasonCodes.PruningIntervalUnconfigured => en
                ? "Confirm how often you prune before we propose a routine year."
                : "Επιβεβαιώστε κάθε πότε κλαδεύετε πριν προτείνουμε συνήθη χρονιά.",
            ReasonCodes.PruningDisabled => en
                ? "Routine pruning proposals are turned off for this field."
                : "Οι συνήθεις προτάσεις κλαδέματος είναι απενεργοποιημένες για αυτό το χωράφι.",
            ReasonCodes.PruningResidueSuppressed => en
                ? "Pruning-residue follow-up is skipped because pruning is not proposed this year."
                : "Η διαχείριση υπολειμμάτων παραλείπεται επειδή δεν προτείνεται κλάδεμα φέτος.",

            ReasonCodes.IrrigationRainFed => en
                ? "This field is rain-fed — recurring irrigation proposals are hidden."
                : "Το χωράφι είναι ξερικό — οι επαναλαμβανόμενες προτάσεις άρδευσης δεν εμφανίζονται.",
            ReasonCodes.IrrigationAskFirst => en
                ? "Ask before proposing irrigation — this field is irrigated only in some years."
                : "Ρωτήστε πριν προτείνετε πότισμα — το χωράφι ποτίζεται μόνο μερικές χρονιές.",
            ReasonCodes.IrrigationUnknownNoRecurring => en
                ? "Irrigation scheduling is paused until we know whether the field is irrigated."
                : "Ο προγραμματισμός άρδευσης παγώνει μέχρι να γνωρίζουμε αν το χωράφι ποτίζεται.",
            ReasonCodes.IrrigationUnknownInspection => en
                ? "A light irrigation-system check may be worth reviewing."
                : "Ένας ελαφρύς έλεγχος αρδευτικού μπορεί να αξίζει ανασκόπηση.",
            ReasonCodes.IrrigationAgronomist => en
                ? "Review irrigation timing with the person who decides watering."
                : "Ανασκοπήστε τον χρόνο ποτίσματος με όποιον αποφασίζει.",
            ReasonCodes.IrrigationEnabled => en
                ? "Irrigation proposals are enabled for this irrigated field."
                : "Οι προτάσεις άρδευσης είναι ενεργές για αυτό το ποτιστικό χωράφι.",

            ReasonCodes.FertilisationDisabled => en
                ? "Routine fertilisation proposals are hidden — inspection information may still appear."
                : "Οι συνήθεις προτάσεις λίπανσης είναι κρυφές — πληροφορίες ελέγχου μπορεί να εμφανίζονται.",
            ReasonCodes.FertilisationNeedsEvidence => en
                ? "Fertiliser application waits for analysis, observation or professional guidance."
                : "Η εφαρμογή λιπάσματος περιμένει ανάλυση, παρατήρηση ή επαγγελματική καθοδήγηση.",
            ReasonCodes.FertilisationEvidencePresent => en
                ? "There is enough reason to review a fertiliser application."
                : "Υπάρχει αρκετή ένδειξη για ανασκόπηση εφαρμογής λιπάσματος.",
            ReasonCodes.FertilisationAgronomistReview => en
                ? "Review fertilisation with your agronomist before applying."
                : "Ανασκοπήστε τη λίπανση με τον γεωπόνο σας πριν την εφαρμογή.",
            ReasonCodes.FertilisationAskFirst => en
                ? "Confirm before proposing fertilisation for this field."
                : "Επιβεβαιώστε πριν προτείνουμε λίπανση για αυτό το χωράφι.",
            ReasonCodes.FertilisationUnknownReview => en
                ? "A nutrition-plan review may be worth checking."
                : "Μια ανασκόπηση σχεδίου θρέψης μπορεί να αξίζει έλεγχο.",
            ReasonCodes.FertilisationPlanEnabled => en
                ? "An annual fertilisation plan may be useful this year."
                : "Ένα ετήσιο σχέδιο λίπανσης μπορεί να χρειάζεται φέτος.",
            ReasonCodes.FertilisationPlanWithEvidencePreference => en
                ? "Plan fertilisation from analyses — not from the calendar alone."
                : "Σχεδιάστε λίπανση από αναλύσεις — όχι μόνο από το ημερολόγιο.",
            ReasonCodes.FertilisationApplicationEnabled => en
                ? "A fertiliser application may still be due this year."
                : "Μπορεί να απομένει εφαρμογή λιπάσματος φέτος.",

            ReasonCodes.GroundCoverQuotaMet => en
                ? "You already reached the usual number of ground-cover passes this year."
                : "Έχετε ήδη φτάσει τον συνήθη αριθμό καθαρισμών χόρτων φέτος.",
            ReasonCodes.GroundCoverRemaining => en
                ? "There are still ground-cover passes expected this year."
                : "Απομένουν καθαρισμοί χόρτων για φέτος.",
            ReasonCodes.GroundCoverNeedsEvidence => en
                ? "Ground-cover work is only suggested when vegetation or fire risk needs a look."
                : "Τα χόρτα προτείνονται μόνο όταν υπάρχει ένδειξη βλάστησης ή κινδύνου φωτιάς.",
            ReasonCodes.GroundCoverEvidencePresent => en
                ? "There is a reason to review ground cover."
                : "Υπάρχει λόγος για ανασκόπηση κάλυψης εδάφους.",
            ReasonCodes.GroundCoverNoFixedClearing => en
                ? "No fixed clearing routine — skipping repeated reminders."
                : "Δεν υπάρχει σταθερός καθαρισμός — παραλείπονται επαναλαμβανόμενες υπενθυμίσεις.",
            ReasonCodes.GroundCoverDisabled => en
                ? "Routine ground-cover proposals are turned off."
                : "Οι συνήθεις προτάσεις καθαρισμού χόρτων είναι απενεργοποιημένες.",
            ReasonCodes.GroundCoverAskFirst => en
                ? "Ask before proposing ground-cover work."
                : "Ρωτήστε πριν προτείνετε καθαρισμό χόρτων.",

            ReasonCodes.PestTreatmentSuppressed => en
                ? "Routine treatment proposals are hidden. Official alerts can still appear."
                : "Οι συνήθεις προτάσεις επέμβασης είναι κρυφές. Οι επίσημες ειδοποιήσεις μπορούν να εμφανίζονται.",
            ReasonCodes.PestMonitoringKeptAsInformation => en
                ? "Monitoring stays available as information even without usual treatments."
                : "Η παρακολούθηση παραμένει διαθέσιμη ως πληροφορία ακόμα χωρίς συνήθεις επεμβάσεις.",
            ReasonCodes.PestAgronomistDecision => en
                ? "Review olive-fly and pest decisions with your agronomist."
                : "Ανασκοπήστε τις αποφάσεις για δάκο και προσβολές με τον γεωπόνο σας.",
            ReasonCodes.PestUnknownAskFirst => en
                ? "Confirm how you decide on pests before we propose routine monitoring."
                : "Επιβεβαιώστε πώς αποφασίζετε για προσβολές πριν προτείνουμε συνήθη παρακολούθηση.",
            ReasonCodes.PestTrapsNotInstalled => en
                ? "Confirm whether traps should be installed on this field."
                : "Επιβεβαιώστε αν πρέπει να τοποθετηθούν παγίδες σε αυτό το χωράφι.",
            ReasonCodes.PestMonitoringEnabled => en
                ? "Pest monitoring proposals follow how you decide on this field."
                : "Οι προτάσεις παρακολούθησης ακολουθούν τον τρόπο απόφασης στο χωράφι.",

            ReasonCodes.AnalysisDisabled => en
                ? "Routine analysis proposals are turned off for this field."
                : "Οι συνήθεις προτάσεις αναλύσεων είναι απενεργοποιημένες για αυτό το χωράφι.",
            ReasonCodes.AnalysisNotDue => en
                ? "The next analysis is not due yet based on your last sample."
                : "Η επόμενη ανάλυση δεν προβλέπεται ακόμη με βάση το τελευταίο δείγμα.",
            ReasonCodes.AnalysisDue => en
                ? "An analysis may be due based on the usual interval."
                : "Μια ανάλυση μπορεί να προβλέπεται με βάση τη συνήθη συχνότητα.",
            ReasonCodes.AnalysisUnknownWorthChecking => en
                ? "An analysis may be worth checking this season."
                : "Μια ανάλυση μπορεί να αξίζει έλεγχο αυτή την εποχή.",

            ReasonCodes.HarvestPrepOutsideWindow => en
                ? "Harvest preparation opens about six weeks before your expected harvest start."
                : "Η προετοιμασία συγκομιδής ανοίγει περίπου έξι εβδομάδες πριν την αναμενόμενη έναρξη.",
            ReasonCodes.HarvestPrepInWindow => en
                ? "It is a good time to prepare crew, equipment and mill booking."
                : "Είναι καλή περίοδος για προετοιμασία συνεργείου, εξοπλισμού και ελαιοτριβείου.",
            ReasonCodes.PreHarvestOutsideWindow => en
                ? "Pre-harvest readiness opens about two weeks before harvest."
                : "Η ετοιμότητα πριν τη συγκομιδή ανοίγει περίπου δύο εβδομάδες πριν.",
            ReasonCodes.PreHarvestInWindow => en
                ? "Pre-harvest readiness and PHI review may be due."
                : "Μπορεί να χρειάζεται έλεγχος ετοιμότητας και διαστήματος PHI πριν τη συγκομιδή.",

            _ => en ? "Personalised for this field." : "Προσωποποιημένο για αυτό το χωράφι."
        };
    }
}
