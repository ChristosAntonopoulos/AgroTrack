using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Application.Mappings;

public static class FieldWorkMapper
{
    public static FieldWorkTemplateDto ToDto(FieldWorkTaskTemplate template, string language = "el") => new()
    {
        Id = template.Id,
        Code = template.Code,
        CurrentVersion = template.CurrentVersion,
        GreekName = template.GreekName,
        EnglishName = template.EnglishName,
        Name = IsEnglish(language) ? template.EnglishName : template.GreekName,
        Category = template.Category,
        Description = template.Description,
        IsActive = template.IsActive
    };

    public static TaskProposalDto ToDto(TaskProposal proposal, string language = "el") => new()
    {
        Id = proposal.Id,
        FieldId = proposal.FieldId,
        ResultYear = proposal.ResultYear,
        TemplateCode = proposal.TemplateCode,
        TemplateVersion = proposal.TemplateVersion,
        SourceType = proposal.SourceType.ToApiString(),
        SourceTypeLabel = FieldWorkDisplayLabels.ForProposalSource(proposal.SourceType, language),
        SourceReference = proposal.SourceReference,
        GeneratedAt = proposal.GeneratedAt,
        ValidFrom = proposal.ValidFrom,
        ValidUntil = proposal.ValidUntil,
        Confidence = proposal.Confidence.ToApiString(),
        ConfidenceLabel = FieldWorkDisplayLabels.ForConfidence(proposal.Confidence, language),
        ReasonCodes = proposal.ReasonCodes.ToList(),
        Explanation = IsEnglish(language) && !string.IsNullOrWhiteSpace(proposal.EnglishExplanation)
            ? proposal.EnglishExplanation!
            : proposal.GreekExplanation,
        GreekExplanation = proposal.GreekExplanation,
        EnglishExplanation = proposal.EnglishExplanation,
        RequiredEvidence = proposal.RequiredEvidence,
        RecommendedWindowStart = proposal.RecommendedWindowStart,
        RecommendedWindowEnd = proposal.RecommendedWindowEnd,
        Status = proposal.Status.ToApiString(),
        StatusLabel = proposal.Status == TaskProposalStatus.Active
            ? FieldWorkDisplayLabels.ProposedStatus(language)
            : proposal.Status.ToApiString(),
        AcceptedTaskId = proposal.AcceptedTaskId,
        SnoozeUntil = proposal.SnoozeUntil
    };

    public static FieldTaskDto ToDto(FieldTask task, string language = "el") => new()
    {
        Id = task.Id,
        FieldId = task.FieldId,
        ResultYear = task.ResultYear,
        TemplateCode = task.TemplateCode,
        TemplateVersion = task.TemplateVersion,
        Title = task.Title,
        Description = task.Description,
        Status = task.Status.ToApiString(),
        StatusLabel = FieldWorkDisplayLabels.ForTaskStatus(task.Status, language),
        PlannedStart = task.PlannedStart,
        PlannedEnd = task.PlannedEnd,
        PreferredTimeWindow = task.PreferredTimeWindow,
        AssignedUserId = task.AssignedUserId,
        AssignedCollaboratorId = task.AssignedCollaboratorId,
        ResponsibleUserId = task.ResponsibleUserId,
        AdditionalParticipantUserIds = task.AdditionalParticipantUserIds.ToList(),
        AssignmentResponse = task.AssignmentResponse.ToApiString(),
        ProposalId = task.ProposalId,
        Checklist = task.ChecklistSnapshot
            .OrderBy(c => c.SortOrder)
            .Select(c => ToChecklistDto(c, language))
            .ToList(),
        EstimatedCost = task.EstimatedCost,
        EstimatedCostCurrency = task.EstimatedCostCurrency,
        Notes = task.Notes,
        AttachmentIds = task.AttachmentIds.ToList(),
        RelatedHarvestId = task.RelatedHarvestId,
        WeatherSuitability = task.WeatherSuitability.ToApiString(),
        WeatherSuitabilityLabel = FieldWorkDisplayLabels.ForWeatherSuitability(task.WeatherSuitability, language),
        LatestExecutionId = task.LatestExecutionId,
        CreatedByUserId = task.CreatedByUserId,
        CreatedAt = task.CreatedAt,
        UpdatedAt = task.UpdatedAt
    };

    public static TaskExecutionDto ToDto(TaskExecution execution, string language = "el") => new()
    {
        Id = execution.Id,
        TaskId = execution.TaskId,
        FieldId = execution.FieldId,
        ResultYear = execution.ResultYear,
        StartedAt = execution.StartedAt,
        CompletedAt = execution.CompletedAt,
        Outcome = execution.Outcome.ToApiString(),
        OutcomeLabel = FieldWorkDisplayLabels.ForExecutionOutcome(execution.Outcome, language),
        CompletedByUserIds = execution.CompletedByUserIds.ToList(),
        Notes = execution.Notes,
        AttachmentIds = execution.AttachmentIds.ToList(),
        FollowUpRequired = execution.FollowUpRequired,
        FollowUpTaskId = execution.FollowUpTaskId
    };

    public static FieldPhenologyDto ToDto(string fieldId, FieldPhenologySnapshot snapshot, string language = "el") => new()
    {
        FieldId = fieldId,
        IsKnown = snapshot.IsKnown,
        StageCode = snapshot.StageCode.ToApiString(),
        StageLabel = FieldWorkDisplayLabels.ForBbchStage(snapshot.StageCode, language),
        Message = snapshot.IsKnown
            ? FieldWorkDisplayLabels.ForBbchStage(snapshot.StageCode, language)
            : FieldWorkDisplayLabels.UnknownPhenology(language),
        RecordStageActionLabel = snapshot.IsKnown ? null : FieldWorkDisplayLabels.RecordStage(language),
        ObservedOn = snapshot.ObservedOn,
        Source = snapshot.Source?.ToApiString(),
        Confidence = snapshot.Confidence?.ToApiString(),
        ConfidenceLabel = snapshot.Confidence.HasValue
            ? FieldWorkDisplayLabels.ForConfidence(snapshot.Confidence.Value, language)
            : null,
        ObservationId = snapshot.ObservationId,
        PhotoIds = snapshot.PhotoIds.ToList(),
        Notes = snapshot.Notes
    };

    public static FieldPhenologyObservationDto ToDto(FieldPhenologyObservation observation, string language = "el") => new()
    {
        Id = observation.Id,
        FieldId = observation.FieldId,
        StageCode = observation.StageCode.ToApiString(),
        StageLabel = FieldWorkDisplayLabels.ForBbchStage(observation.StageCode, language),
        ObservedOn = observation.ObservedOn,
        Source = observation.Source.ToApiString(),
        Confidence = observation.Confidence.ToApiString(),
        ConfidenceLabel = FieldWorkDisplayLabels.ForConfidence(observation.Confidence, language),
        PhotoIds = observation.PhotoIds.ToList(),
        Notes = observation.Notes,
        ObservedByUserId = observation.ObservedByUserId
    };

    public static FieldWorkProfileDto ToDto(FieldWorkProfile profile, string language = "el") => new()
    {
        Id = profile.Id,
        FieldId = profile.FieldId,
        ResultYearCreated = profile.ResultYearCreated,
        ProfileVersion = profile.ProfileVersion,
        OnboardingVersion = profile.OnboardingVersion,
        Status = profile.Status.ToApiString(),
        StatusLabel = FieldWorkDisplayLabels.ForProfileStatus(profile.Status, language),
        ProductionPurpose = profile.ProductionPurpose.ToApiString(),
        ProductionPurposeLabel = FieldWorkDisplayLabels.ForProductionPurpose(profile.ProductionPurpose, language),
        Irrigation = ToIrrigationDto(profile.Irrigation, language),
        Pruning = ToPracticeDto(profile.Pruning, language),
        Fertilisation = ToFertilisationDto(profile.Fertilisation, language),
        GroundCover = ToGroundCoverDto(profile.GroundCover, language),
        PestManagement = ToPestDto(profile.PestManagement, language),
        Analysis = ToAnalysisDto(profile.Analysis, language),
        Harvest = ToHarvestDto(profile.Harvest, language),
        DefaultAssignments = new DefaultAssignmentsDto
        {
            Entries = profile.DefaultAssignments.Entries
                .Select(e => new DefaultAssignmentEntryDto
                {
                    Category = e.Category,
                    AssigneeUserId = e.AssigneeUserId,
                    IsSelf = e.IsSelf
                })
                .ToList()
        },
        NotificationPreference = new NotificationPreferenceDto
        {
            Intensity = profile.NotificationPreference.Intensity.ToApiString(),
            IntensityLabel = FieldWorkDisplayLabels.ForNotificationIntensity(
                profile.NotificationPreference.Intensity, language),
            AcceptedTaskReminderDaysBefore = profile.NotificationPreference.AcceptedTaskReminderDaysBefore
        },
        CurrentYearDeclaredWork = profile.CurrentYearDeclaredWork
            .Select(w => ToDeclaredWorkDto(w, language))
            .ToList(),
        CompletedAt = profile.CompletedAt,
        CompletedByUserId = profile.CompletedByUserId,
        LastReviewedAt = profile.LastReviewedAt,
        CreatedByUserId = profile.CreatedByUserId,
        UpdatedByUserId = profile.UpdatedByUserId,
        CreatedAt = profile.CreatedAt,
        UpdatedAt = profile.UpdatedAt
    };

    private static PracticeProfileDto ToPracticeDto(PracticeProfileBase profile, string language)
    {
        var precision = profile.DatePrecision;
        return new PracticeProfileDto
        {
            PreferenceMode = profile.PreferenceMode.ToApiString(),
            PreferenceModeLabel = FieldWorkDisplayLabels.ForPreferenceMode(profile.PreferenceMode, language),
            FrequencyType = profile.FrequencyType.ToApiString(),
            FrequencyTypeLabel = FieldWorkDisplayLabels.ForFrequencyType(profile.FrequencyType, language),
            FrequencyValue = profile.FrequencyValue,
            PreferredMonths = profile.PreferredMonths.ToList(),
            LastPerformedYear = profile.LastPerformedYear,
            LastPerformedMonth = profile.LastPerformedMonth,
            DatePrecision = precision?.ToApiString(),
            DatePrecisionLabel = precision.HasValue
                ? FieldWorkDisplayLabels.ForDatePrecision(precision.Value, language)
                : null,
            DefaultAssigneeId = profile.DefaultAssigneeId,
            UserNotes = profile.UserNotes,
            Source = profile.Source.ToApiString(),
            ConfirmedAt = profile.ConfirmedAt
        };
    }

    private static IrrigationProfileDto ToIrrigationDto(IrrigationProfile profile, string language)
    {
        var baseDto = ToPracticeDto(profile, language);
        return new IrrigationProfileDto
        {
            PreferenceMode = baseDto.PreferenceMode,
            PreferenceModeLabel = baseDto.PreferenceModeLabel,
            FrequencyType = baseDto.FrequencyType,
            FrequencyTypeLabel = baseDto.FrequencyTypeLabel,
            FrequencyValue = baseDto.FrequencyValue,
            PreferredMonths = baseDto.PreferredMonths,
            LastPerformedYear = baseDto.LastPerformedYear,
            LastPerformedMonth = baseDto.LastPerformedMonth,
            DatePrecision = baseDto.DatePrecision,
            DatePrecisionLabel = baseDto.DatePrecisionLabel,
            DefaultAssigneeId = baseDto.DefaultAssigneeId,
            UserNotes = baseDto.UserNotes,
            Source = baseDto.Source,
            ConfirmedAt = baseDto.ConfirmedAt,
            Method = profile.Method.ToApiString(),
            DecisionMaker = profile.DecisionMaker.ToApiString()
        };
    }

    private static FertilisationProfileDto ToFertilisationDto(FertilisationProfile profile, string language)
    {
        var baseDto = ToPracticeDto(profile, language);
        return new FertilisationProfileDto
        {
            PreferenceMode = baseDto.PreferenceMode,
            PreferenceModeLabel = baseDto.PreferenceModeLabel,
            FrequencyType = baseDto.FrequencyType,
            FrequencyTypeLabel = baseDto.FrequencyTypeLabel,
            FrequencyValue = baseDto.FrequencyValue,
            PreferredMonths = baseDto.PreferredMonths,
            LastPerformedYear = baseDto.LastPerformedYear,
            LastPerformedMonth = baseDto.LastPerformedMonth,
            DatePrecision = baseDto.DatePrecision,
            DatePrecisionLabel = baseDto.DatePrecisionLabel,
            DefaultAssigneeId = baseDto.DefaultAssigneeId,
            UserNotes = baseDto.UserNotes,
            Source = baseDto.Source,
            ConfirmedAt = baseDto.ConfirmedAt,
            DecisionMaker = profile.DecisionMaker.ToApiString()
        };
    }

    private static GroundCoverProfileDto ToGroundCoverDto(GroundCoverProfile profile, string language)
    {
        var baseDto = ToPracticeDto(profile, language);
        return new GroundCoverProfileDto
        {
            PreferenceMode = baseDto.PreferenceMode,
            PreferenceModeLabel = baseDto.PreferenceModeLabel,
            FrequencyType = baseDto.FrequencyType,
            FrequencyTypeLabel = baseDto.FrequencyTypeLabel,
            FrequencyValue = baseDto.FrequencyValue,
            PreferredMonths = baseDto.PreferredMonths,
            LastPerformedYear = baseDto.LastPerformedYear,
            LastPerformedMonth = baseDto.LastPerformedMonth,
            DatePrecision = baseDto.DatePrecision,
            DatePrecisionLabel = baseDto.DatePrecisionLabel,
            DefaultAssigneeId = baseDto.DefaultAssigneeId,
            UserNotes = baseDto.UserNotes,
            Source = baseDto.Source,
            ConfirmedAt = baseDto.ConfirmedAt,
            Methods = profile.Methods.Select(m => m.ToApiString()).ToList()
        };
    }

    private static PestManagementProfileDto ToPestDto(PestManagementProfile profile, string language)
    {
        var baseDto = ToPracticeDto(profile, language);
        return new PestManagementProfileDto
        {
            PreferenceMode = baseDto.PreferenceMode,
            PreferenceModeLabel = baseDto.PreferenceModeLabel,
            FrequencyType = baseDto.FrequencyType,
            FrequencyTypeLabel = baseDto.FrequencyTypeLabel,
            FrequencyValue = baseDto.FrequencyValue,
            PreferredMonths = baseDto.PreferredMonths,
            LastPerformedYear = baseDto.LastPerformedYear,
            LastPerformedMonth = baseDto.LastPerformedMonth,
            DatePrecision = baseDto.DatePrecision,
            DatePrecisionLabel = baseDto.DatePrecisionLabel,
            DefaultAssigneeId = baseDto.DefaultAssigneeId,
            UserNotes = baseDto.UserNotes,
            Source = baseDto.Source,
            ConfirmedAt = baseDto.ConfirmedAt,
            DecisionApproach = profile.DecisionApproach.ToApiString(),
            TrapStatus = profile.TrapStatus.ToApiString()
        };
    }

    private static AnalysisProfileDto ToAnalysisDto(AnalysisProfile profile, string language)
    {
        var baseDto = ToPracticeDto(profile, language);
        return new AnalysisProfileDto
        {
            PreferenceMode = baseDto.PreferenceMode,
            PreferenceModeLabel = baseDto.PreferenceModeLabel,
            FrequencyType = baseDto.FrequencyType,
            FrequencyTypeLabel = baseDto.FrequencyTypeLabel,
            FrequencyValue = baseDto.FrequencyValue,
            PreferredMonths = baseDto.PreferredMonths,
            LastPerformedYear = baseDto.LastPerformedYear,
            LastPerformedMonth = baseDto.LastPerformedMonth,
            DatePrecision = baseDto.DatePrecision,
            DatePrecisionLabel = baseDto.DatePrecisionLabel,
            DefaultAssigneeId = baseDto.DefaultAssigneeId,
            UserNotes = baseDto.UserNotes,
            Source = baseDto.Source,
            ConfirmedAt = baseDto.ConfirmedAt,
            Kinds = profile.Kinds.Select(k => new AnalysisKindEntryDto
            {
                Kind = k.Kind.ToApiString(),
                LastPerformedYear = k.LastPerformedYear,
                DatePrecision = k.DatePrecision?.ToApiString()
            }).ToList()
        };
    }

    private static HarvestProfileDto ToHarvestDto(HarvestProfile profile, string language)
    {
        var baseDto = ToPracticeDto(profile, language);
        return new HarvestProfileDto
        {
            PreferenceMode = baseDto.PreferenceMode,
            PreferenceModeLabel = baseDto.PreferenceModeLabel,
            FrequencyType = baseDto.FrequencyType,
            FrequencyTypeLabel = baseDto.FrequencyTypeLabel,
            FrequencyValue = baseDto.FrequencyValue,
            PreferredMonths = baseDto.PreferredMonths,
            LastPerformedYear = baseDto.LastPerformedYear,
            LastPerformedMonth = baseDto.LastPerformedMonth,
            DatePrecision = baseDto.DatePrecision,
            DatePrecisionLabel = baseDto.DatePrecisionLabel,
            DefaultAssigneeId = baseDto.DefaultAssigneeId,
            UserNotes = baseDto.UserNotes,
            Source = baseDto.Source,
            ConfirmedAt = baseDto.ConfirmedAt,
            ExpectedStartMonth = profile.ExpectedStartMonth,
            Organizer = profile.Organizer.ToApiString(),
            NeedsMillBooking = profile.NeedsMillBooking.ToApiString()
        };
    }

    private static CurrentYearDeclaredWorkDto ToDeclaredWorkDto(
        CurrentYearDeclaredWorkItem item,
        string language) => new()
    {
        Category = item.Category,
        TemplateCode = item.TemplateCode,
        ResultYear = item.ResultYear,
        Completion = item.Completion.ToApiString(),
        ApproximateDate = item.ApproximateDate is null
            ? null
            : new ApproximateDateDto
            {
                Year = item.ApproximateDate.Year,
                Month = item.ApproximateDate.Month,
                Day = item.ApproximateDate.Day,
                Precision = item.ApproximateDate.Precision.ToApiString(),
                PrecisionLabel = FieldWorkDisplayLabels.ForDatePrecision(
                    item.ApproximateDate.Precision, language)
            },
        Source = item.Source.ToApiString()
    };

    private static FieldTaskChecklistItemDto ToChecklistDto(FieldTaskChecklistItem item, string language) => new()
    {
        Key = item.Key,
        Label = IsEnglish(language) ? item.EnglishLabel : item.GreekLabel,
        GreekLabel = item.GreekLabel,
        EnglishLabel = item.EnglishLabel,
        ItemType = item.ItemType.ToApiString(),
        Requirement = item.Requirement.ToApiString(),
        IsEssential = item.IsEssential,
        SortOrder = item.SortOrder,
        IsAnswered = item.IsAnswered,
        TextValue = item.TextValue,
        NumberValue = item.NumberValue,
        BoolValue = item.BoolValue,
        AttachmentIds = item.AttachmentIds.ToList(),
        Choices = item.Choices.ToList(),
        Unit = item.Unit
    };

    private static bool IsEnglish(string language) =>
        language.StartsWith("en", StringComparison.OrdinalIgnoreCase);
}
