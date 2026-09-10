using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using OliveLifecycle.Infrastructure.Persistence.Documents.FieldWork;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class FieldWorkPersistenceMapper
{
    public static FieldWorkTaskTemplate ToEntity(FieldWorkTaskTemplateDocument d) => new()
    {
        Id = d.Id,
        Code = d.Code,
        CurrentVersion = d.CurrentVersion,
        GreekName = d.GreekName,
        EnglishName = d.EnglishName,
        Category = d.Category,
        Description = d.Description,
        CandidateMonthRange = ToMonthDayRange(d.CandidateMonthRange),
        CandidateBbchRange = ToBbchRange(d.CandidateBbchRange),
        DefaultDuration = d.DefaultDurationMinutes is null
            ? null
            : TimeSpan.FromMinutes(d.DefaultDurationMinutes.Value),
        RequiredFieldCapabilities = d.RequiredFieldCapabilities.ToList(),
        WeatherRuleProfile = d.WeatherRuleProfile,
        CompletionSchema = d.CompletionSchema,
        FinancialCategorySuggestion = d.FinancialCategorySuggestion,
        IsActive = d.IsActive,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };

    public static FieldWorkTaskTemplateDocument ToDocument(FieldWorkTaskTemplate e) => new()
    {
        Id = e.Id,
        Code = e.Code,
        CurrentVersion = e.CurrentVersion,
        GreekName = e.GreekName,
        EnglishName = e.EnglishName,
        Category = e.Category,
        Description = e.Description,
        CandidateMonthRange = ToMonthDayRangeDocument(e.CandidateMonthRange),
        CandidateBbchRange = ToBbchRangeDocument(e.CandidateBbchRange),
        DefaultDurationMinutes = e.DefaultDuration.HasValue
            ? (int)e.DefaultDuration.Value.TotalMinutes
            : null,
        RequiredFieldCapabilities = e.RequiredFieldCapabilities.ToList(),
        WeatherRuleProfile = e.WeatherRuleProfile,
        CompletionSchema = e.CompletionSchema,
        FinancialCategorySuggestion = e.FinancialCategorySuggestion,
        IsActive = e.IsActive,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    public static FieldWorkTaskTemplateVersion ToEntity(FieldWorkTaskTemplateVersionDocument d) => new()
    {
        Id = d.Id,
        TemplateCode = d.TemplateCode,
        Version = d.Version,
        GreekName = d.GreekName,
        EnglishName = d.EnglishName,
        Description = d.Description,
        CandidateMonthRange = ToMonthDayRange(d.CandidateMonthRange),
        CandidateBbchRange = ToBbchRange(d.CandidateBbchRange),
        DefaultDuration = d.DefaultDurationMinutes is null
            ? null
            : TimeSpan.FromMinutes(d.DefaultDurationMinutes.Value),
        DefaultChecklist = d.DefaultChecklist.Select(ToChecklistDefinition).ToList(),
        RequiredFieldCapabilities = d.RequiredFieldCapabilities.ToList(),
        WeatherRuleProfile = d.WeatherRuleProfile,
        CompletionSchema = d.CompletionSchema,
        FinancialCategorySuggestion = d.FinancialCategorySuggestion,
        IsActive = d.IsActive,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };

    public static FieldWorkTaskTemplateVersionDocument ToDocument(FieldWorkTaskTemplateVersion e) => new()
    {
        Id = e.Id,
        TemplateCode = e.TemplateCode,
        Version = e.Version,
        GreekName = e.GreekName,
        EnglishName = e.EnglishName,
        Description = e.Description,
        CandidateMonthRange = ToMonthDayRangeDocument(e.CandidateMonthRange),
        CandidateBbchRange = ToBbchRangeDocument(e.CandidateBbchRange),
        DefaultDurationMinutes = e.DefaultDuration.HasValue
            ? (int)e.DefaultDuration.Value.TotalMinutes
            : null,
        DefaultChecklist = e.DefaultChecklist.Select(ToChecklistDefinitionDocument).ToList(),
        RequiredFieldCapabilities = e.RequiredFieldCapabilities.ToList(),
        WeatherRuleProfile = e.WeatherRuleProfile,
        CompletionSchema = e.CompletionSchema,
        FinancialCategorySuggestion = e.FinancialCategorySuggestion,
        IsActive = e.IsActive,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    public static TaskProposal ToEntity(TaskProposalDocument d) => new()
    {
        Id = d.Id,
        FieldId = d.FieldId,
        ResultYear = d.ResultYear,
        TemplateCode = d.TemplateCode,
        TemplateVersion = d.TemplateVersion,
        SourceType = ProposalSourceTypeExtensions.FromApiString(d.SourceType) ?? ProposalSourceType.SeasonalBaseline,
        SourceReference = d.SourceReference,
        GeneratedAt = d.GeneratedAt,
        ValidFrom = d.ValidFrom,
        ValidUntil = d.ValidUntil,
        Confidence = ProposalConfidenceExtensions.FromApiString(d.Confidence) ?? ProposalConfidence.SeasonalReminder,
        ReasonCodes = d.ReasonCodes.ToList(),
        GreekExplanation = d.GreekExplanation,
        EnglishExplanation = d.EnglishExplanation,
        RequiredEvidence = d.RequiredEvidence,
        WeatherEvaluationId = d.WeatherEvaluationId,
        RecommendedWindowStart = d.RecommendedWindowStart,
        RecommendedWindowEnd = d.RecommendedWindowEnd,
        DedupKey = d.DedupKey,
        Status = TaskProposalStatusExtensions.FromApiString(d.Status) ?? TaskProposalStatus.Active,
        Decision = TaskProposalDecisionExtensions.FromApiString(d.Decision),
        DecisionAt = d.DecisionAt,
        DecisionByUserId = d.DecisionByUserId,
        AcceptedTaskId = d.AcceptedTaskId,
        SnoozeUntil = d.SnoozeUntil,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };

    public static TaskProposalDocument ToDocument(TaskProposal e) => new()
    {
        Id = e.Id,
        FieldId = e.FieldId,
        ResultYear = e.ResultYear,
        TemplateCode = e.TemplateCode,
        TemplateVersion = e.TemplateVersion,
        SourceType = e.SourceType.ToApiString(),
        SourceReference = e.SourceReference,
        GeneratedAt = e.GeneratedAt,
        ValidFrom = e.ValidFrom,
        ValidUntil = e.ValidUntil,
        Confidence = e.Confidence.ToApiString(),
        ReasonCodes = e.ReasonCodes.ToList(),
        GreekExplanation = e.GreekExplanation,
        EnglishExplanation = e.EnglishExplanation,
        RequiredEvidence = e.RequiredEvidence,
        WeatherEvaluationId = e.WeatherEvaluationId,
        RecommendedWindowStart = e.RecommendedWindowStart,
        RecommendedWindowEnd = e.RecommendedWindowEnd,
        DedupKey = e.DedupKey,
        OpenDedupKey = e.Status.IsOpen() ? e.DedupKey : null,
        Status = e.Status.ToApiString(),
        Decision = e.Decision?.ToApiString(),
        DecisionAt = e.DecisionAt,
        DecisionByUserId = e.DecisionByUserId,
        AcceptedTaskId = e.AcceptedTaskId,
        SnoozeUntil = e.SnoozeUntil,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    public static FieldTask ToEntity(FieldTaskDocument d) => new()
    {
        Id = d.Id,
        FieldId = d.FieldId,
        ResultYear = d.ResultYear,
        TemplateCode = d.TemplateCode,
        TemplateVersion = d.TemplateVersion,
        Title = d.Title,
        Description = d.Description,
        Status = FieldTaskStatusExtensions.FromApiString(d.Status) ?? FieldTaskStatus.Planned,
        PlannedStart = d.PlannedStart,
        PlannedEnd = d.PlannedEnd,
        PreferredTimeWindow = d.PreferredTimeWindow,
        AssignedUserId = d.AssignedUserId,
        AssignedCollaboratorId = d.AssignedCollaboratorId,
        ResponsibleUserId = d.ResponsibleUserId,
        AdditionalParticipantUserIds = d.AdditionalParticipantUserIds.ToList(),
        AssignmentResponse = TaskAssignmentResponseExtensions.FromApiString(d.AssignmentResponse),
        AssignmentRespondedAt = d.AssignmentRespondedAt,
        ProposalId = d.ProposalId,
        ChecklistSnapshot = d.ChecklistSnapshot.Select(ToChecklistItem).ToList(),
        EstimatedCost = d.EstimatedCost,
        EstimatedCostCurrency = d.EstimatedCostCurrency,
        EstimatedLabourHours = d.EstimatedLabourHours,
        Notes = d.Notes,
        AttachmentIds = d.AttachmentIds.ToList(),
        RelatedHarvestId = d.RelatedHarvestId,
        WeatherEvaluationId = d.WeatherEvaluationId,
        WeatherSuitability = WeatherSuitabilityExtensions.FromApiString(d.WeatherSuitability),
        ProductLabel = d.ProductLabel == null
            ? null
            : new PlantProtectionProductLabel
            {
                ProductName = d.ProductLabel.ProductName,
                ProductCode = d.ProductLabel.ProductCode,
                RainfastHours = d.ProductLabel.RainfastHours,
                MaxWindKmh = d.ProductLabel.MaxWindKmh,
                MaxGustKmh = d.ProductLabel.MaxGustKmh,
                MinHumidityPercent = d.ProductLabel.MinHumidityPercent,
                MaxHumidityPercent = d.ProductLabel.MaxHumidityPercent,
                IsApprovedForCropAndTarget = d.ProductLabel.IsApprovedForCropAndTarget
            },
        LatestExecutionId = d.LatestExecutionId,
        CreatedByUserId = d.CreatedByUserId,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };

    public static FieldTaskDocument ToDocument(FieldTask e) => new()
    {
        Id = e.Id,
        FieldId = e.FieldId,
        ResultYear = e.ResultYear,
        TemplateCode = e.TemplateCode,
        TemplateVersion = e.TemplateVersion,
        Title = e.Title,
        Description = e.Description,
        Status = e.Status.ToApiString(),
        PlannedStart = e.PlannedStart,
        PlannedEnd = e.PlannedEnd,
        PreferredTimeWindow = e.PreferredTimeWindow,
        AssignedUserId = e.AssignedUserId,
        AssignedCollaboratorId = e.AssignedCollaboratorId,
        ResponsibleUserId = e.ResponsibleUserId,
        AdditionalParticipantUserIds = e.AdditionalParticipantUserIds.ToList(),
        AssignmentResponse = e.AssignmentResponse.ToApiString(),
        AssignmentRespondedAt = e.AssignmentRespondedAt,
        ProposalId = e.ProposalId,
        ChecklistSnapshot = e.ChecklistSnapshot.Select(ToChecklistItemDocument).ToList(),
        EstimatedCost = e.EstimatedCost,
        EstimatedCostCurrency = e.EstimatedCostCurrency,
        EstimatedLabourHours = e.EstimatedLabourHours,
        Notes = e.Notes,
        AttachmentIds = e.AttachmentIds.ToList(),
        RelatedHarvestId = e.RelatedHarvestId,
        WeatherEvaluationId = e.WeatherEvaluationId,
        WeatherSuitability = e.WeatherSuitability.ToApiString(),
        ProductLabel = e.ProductLabel == null
            ? null
            : new PlantProtectionProductLabelDocument
            {
                ProductName = e.ProductLabel.ProductName,
                ProductCode = e.ProductLabel.ProductCode,
                RainfastHours = e.ProductLabel.RainfastHours,
                MaxWindKmh = e.ProductLabel.MaxWindKmh,
                MaxGustKmh = e.ProductLabel.MaxGustKmh,
                MinHumidityPercent = e.ProductLabel.MinHumidityPercent,
                MaxHumidityPercent = e.ProductLabel.MaxHumidityPercent,
                IsApprovedForCropAndTarget = e.ProductLabel.IsApprovedForCropAndTarget
            },
        LatestExecutionId = e.LatestExecutionId,
        CreatedByUserId = e.CreatedByUserId,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    public static TaskExecution ToEntity(TaskExecutionDocument d) => new()
    {
        Id = d.Id,
        TaskId = d.TaskId,
        FieldId = d.FieldId,
        ResultYear = d.ResultYear,
        StartedAt = d.StartedAt,
        CompletedAt = d.CompletedAt,
        Outcome = TaskExecutionOutcomeExtensions.FromApiString(d.Outcome) ?? TaskExecutionOutcome.Completed,
        CompletedByUserIds = d.CompletedByUserIds.ToList(),
        ChecklistResults = d.ChecklistResults.Select(ToChecklistResult).ToList(),
        Materials = d.Materials.Select(ToMaterial).ToList(),
        TreatedAreaHectares = d.TreatedAreaHectares,
        Quantities = d.Quantities.Select(ToQuantity).ToList(),
        Notes = d.Notes,
        AttachmentIds = d.AttachmentIds.ToList(),
        WeatherEvaluationId = d.WeatherEvaluationId,
        WeatherSuitability = WeatherSuitabilityExtensions.FromApiString(d.WeatherSuitability),
        FollowUpRequired = d.FollowUpRequired,
        FollowUpTaskId = d.FollowUpTaskId,
        RecordedByUserId = d.RecordedByUserId,
        PlannedStartSnapshot = d.PlannedStartSnapshot,
        PlannedEndSnapshot = d.PlannedEndSnapshot,
        UndoneAt = d.UndoneAt,
        UndoneByUserId = d.UndoneByUserId,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };

    public static TaskExecutionDocument ToDocument(TaskExecution e) => new()
    {
        Id = e.Id,
        TaskId = e.TaskId,
        FieldId = e.FieldId,
        ResultYear = e.ResultYear,
        StartedAt = e.StartedAt,
        CompletedAt = e.CompletedAt,
        Outcome = e.Outcome.ToApiString(),
        CompletedByUserIds = e.CompletedByUserIds.ToList(),
        ChecklistResults = e.ChecklistResults.Select(ToChecklistResultDocument).ToList(),
        Materials = e.Materials.Select(ToMaterialDocument).ToList(),
        TreatedAreaHectares = e.TreatedAreaHectares,
        Quantities = e.Quantities.Select(ToQuantityDocument).ToList(),
        Notes = e.Notes,
        AttachmentIds = e.AttachmentIds.ToList(),
        WeatherEvaluationId = e.WeatherEvaluationId,
        WeatherSuitability = e.WeatherSuitability.ToApiString(),
        FollowUpRequired = e.FollowUpRequired,
        FollowUpTaskId = e.FollowUpTaskId,
        RecordedByUserId = e.RecordedByUserId,
        PlannedStartSnapshot = e.PlannedStartSnapshot,
        PlannedEndSnapshot = e.PlannedEndSnapshot,
        UndoneAt = e.UndoneAt,
        UndoneByUserId = e.UndoneByUserId,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    public static FieldPhenologyObservation ToEntity(FieldPhenologyObservationDocument d) => new()
    {
        Id = d.Id,
        FieldId = d.FieldId,
        StageCode = OliveBbchStageExtensions.FromApiString(d.StageCode),
        ObservedOn = d.ObservedOn,
        Source = PhenologySourceExtensions.FromApiString(d.Source) ?? PhenologySource.User,
        Confidence = ProposalConfidenceExtensions.FromApiString(d.Confidence) ?? ProposalConfidence.WorthChecking,
        PhotoIds = d.PhotoIds.ToList(),
        Notes = d.Notes,
        ObservedByUserId = d.ObservedByUserId,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };

    public static FieldPhenologyObservationDocument ToDocument(FieldPhenologyObservation e) => new()
    {
        Id = e.Id,
        FieldId = e.FieldId,
        StageCode = e.StageCode.ToApiString(),
        ObservedOn = e.ObservedOn,
        Source = e.Source.ToApiString(),
        Confidence = e.Confidence.ToApiString(),
        PhotoIds = e.PhotoIds.ToList(),
        Notes = e.Notes,
        ObservedByUserId = e.ObservedByUserId,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    public static TaskWeatherEvaluation ToEntity(TaskWeatherEvaluationDocument d) => new()
    {
        Id = d.Id,
        TaskId = d.TaskId,
        ProposalId = d.ProposalId,
        FieldId = d.FieldId,
        TemplateCode = d.TemplateCode,
        CandidateDate = d.CandidateDate,
        CandidateDuration = d.CandidateDurationMinutes is null
            ? null
            : TimeSpan.FromMinutes(d.CandidateDurationMinutes.Value),
        Suitability = WeatherSuitabilityExtensions.FromApiString(d.Suitability),
        Score = d.Score,
        Reasons = d.Reasons.ToList(),
        HardBlockers = d.HardBlockers.ToList(),
        WeatherSnapshotJson = d.WeatherSnapshotJson,
        EvaluatedAt = d.EvaluatedAt,
        ForecastHorizonHours = d.ForecastHorizonHours,
        SuggestedAlternativeDates = d.SuggestedAlternativeDates.ToList(),
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };

    public static TaskWeatherEvaluationDocument ToDocument(TaskWeatherEvaluation e) => new()
    {
        Id = e.Id,
        TaskId = e.TaskId,
        ProposalId = e.ProposalId,
        FieldId = e.FieldId,
        TemplateCode = e.TemplateCode,
        CandidateDate = e.CandidateDate,
        CandidateDurationMinutes = e.CandidateDuration.HasValue
            ? (int)e.CandidateDuration.Value.TotalMinutes
            : null,
        Suitability = e.Suitability.ToApiString(),
        Score = e.Score,
        Reasons = e.Reasons.ToList(),
        HardBlockers = e.HardBlockers.ToList(),
        WeatherSnapshotJson = e.WeatherSnapshotJson,
        EvaluatedAt = e.EvaluatedAt,
        ForecastHorizonHours = e.ForecastHorizonHours,
        SuggestedAlternativeDates = e.SuggestedAlternativeDates.ToList(),
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    public static OfficialAgriculturalWarning ToEntity(OfficialAgriculturalWarningDocument d) => new()
    {
        Id = d.Id,
        Title = d.Title,
        Message = d.Message,
        SourceOrganization = d.SourceOrganization,
        SourceUrl = d.SourceUrl,
        SourceReference = d.SourceReference,
        PublishedAt = d.PublishedAt,
        ValidFrom = d.ValidFrom,
        ValidUntil = d.ValidUntil,
        FieldIds = d.FieldIds.ToList(),
        RegionCodes = d.RegionCodes.ToList(),
        TemplateCodes = d.TemplateCodes.ToList(),
        RelevantBbchRange = ToBbchRange(d.RelevantBbchRange),
        Confidence = ProposalConfidenceExtensions.FromApiString(d.Confidence) ?? ProposalConfidence.StrongEvidence,
        IsActive = d.IsActive,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };

    public static OfficialAgriculturalWarningDocument ToDocument(OfficialAgriculturalWarning e) => new()
    {
        Id = e.Id,
        Title = e.Title,
        Message = e.Message,
        SourceOrganization = e.SourceOrganization,
        SourceUrl = e.SourceUrl,
        SourceReference = e.SourceReference,
        PublishedAt = e.PublishedAt,
        ValidFrom = e.ValidFrom,
        ValidUntil = e.ValidUntil,
        FieldIds = e.FieldIds.ToList(),
        RegionCodes = e.RegionCodes.ToList(),
        TemplateCodes = e.TemplateCodes.ToList(),
        RelevantBbchRange = ToBbchRangeDocument(e.RelevantBbchRange),
        Confidence = e.Confidence.ToApiString(),
        IsActive = e.IsActive,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    private static MonthDayRange? ToMonthDayRange(MonthDayRangeDocument? d) =>
        d is null ? null : new MonthDayRange
        {
            StartMonth = d.StartMonth,
            StartDay = d.StartDay,
            EndMonth = d.EndMonth,
            EndDay = d.EndDay
        };

    private static MonthDayRangeDocument? ToMonthDayRangeDocument(MonthDayRange? e) =>
        e is null ? null : new MonthDayRangeDocument
        {
            StartMonth = e.StartMonth,
            StartDay = e.StartDay,
            EndMonth = e.EndMonth,
            EndDay = e.EndDay
        };

    private static BbchRange? ToBbchRange(BbchRangeDocument? d) =>
        d is null ? null : new BbchRange { MinCode = d.MinCode, MaxCode = d.MaxCode };

    private static BbchRangeDocument? ToBbchRangeDocument(BbchRange? e) =>
        e is null ? null : new BbchRangeDocument { MinCode = e.MinCode, MaxCode = e.MaxCode };

    private static TaskChecklistDefinition ToChecklistDefinition(TaskChecklistDefinitionDocument d) => new()
    {
        Key = d.Key,
        GreekLabel = d.GreekLabel,
        EnglishLabel = d.EnglishLabel,
        ItemType = ChecklistItemTypeExtensions.FromApiString(d.ItemType),
        Requirement = ChecklistItemRequirementExtensions.FromApiString(d.Requirement),
        Choices = d.Choices.ToList(),
        Unit = d.Unit,
        IsEssential = d.IsEssential,
        SortOrder = d.SortOrder
    };

    private static TaskChecklistDefinitionDocument ToChecklistDefinitionDocument(TaskChecklistDefinition e) => new()
    {
        Key = e.Key,
        GreekLabel = e.GreekLabel,
        EnglishLabel = e.EnglishLabel,
        ItemType = e.ItemType.ToApiString(),
        Requirement = e.Requirement.ToApiString(),
        Choices = e.Choices.ToList(),
        Unit = e.Unit,
        IsEssential = e.IsEssential,
        SortOrder = e.SortOrder
    };

    private static FieldTaskChecklistItem ToChecklistItem(FieldTaskChecklistItemDocument d) => new()
    {
        Key = d.Key,
        GreekLabel = d.GreekLabel,
        EnglishLabel = d.EnglishLabel,
        ItemType = ChecklistItemTypeExtensions.FromApiString(d.ItemType),
        Requirement = ChecklistItemRequirementExtensions.FromApiString(d.Requirement),
        Choices = d.Choices.ToList(),
        Unit = d.Unit,
        IsEssential = d.IsEssential,
        SortOrder = d.SortOrder,
        IsAnswered = d.IsAnswered,
        TextValue = d.TextValue,
        NumberValue = d.NumberValue,
        BoolValue = d.BoolValue,
        AttachmentIds = d.AttachmentIds.ToList()
    };

    private static FieldTaskChecklistItemDocument ToChecklistItemDocument(FieldTaskChecklistItem e) => new()
    {
        Key = e.Key,
        GreekLabel = e.GreekLabel,
        EnglishLabel = e.EnglishLabel,
        ItemType = e.ItemType.ToApiString(),
        Requirement = e.Requirement.ToApiString(),
        Choices = e.Choices.ToList(),
        Unit = e.Unit,
        IsEssential = e.IsEssential,
        SortOrder = e.SortOrder,
        IsAnswered = e.IsAnswered,
        TextValue = e.TextValue,
        NumberValue = e.NumberValue,
        BoolValue = e.BoolValue,
        AttachmentIds = e.AttachmentIds.ToList()
    };

    private static TaskExecutionChecklistResult ToChecklistResult(TaskExecutionChecklistResultDocument d) => new()
    {
        Key = d.Key,
        GreekLabel = d.GreekLabel,
        EnglishLabel = d.EnglishLabel,
        ItemType = ChecklistItemTypeExtensions.FromApiString(d.ItemType),
        Requirement = ChecklistItemRequirementExtensions.FromApiString(d.Requirement),
        IsAnswered = d.IsAnswered,
        TextValue = d.TextValue,
        NumberValue = d.NumberValue,
        BoolValue = d.BoolValue,
        Unit = d.Unit,
        AttachmentIds = d.AttachmentIds.ToList()
    };

    private static TaskExecutionChecklistResultDocument ToChecklistResultDocument(TaskExecutionChecklistResult e) => new()
    {
        Key = e.Key,
        GreekLabel = e.GreekLabel,
        EnglishLabel = e.EnglishLabel,
        ItemType = e.ItemType.ToApiString(),
        Requirement = e.Requirement.ToApiString(),
        IsAnswered = e.IsAnswered,
        TextValue = e.TextValue,
        NumberValue = e.NumberValue,
        BoolValue = e.BoolValue,
        Unit = e.Unit,
        AttachmentIds = e.AttachmentIds.ToList()
    };

    private static TaskMaterial ToMaterial(TaskMaterialDocument d) => new()
    {
        Name = d.Name,
        Quantity = d.Quantity,
        Unit = d.Unit,
        ProductCode = d.ProductCode,
        Notes = d.Notes
    };

    private static TaskMaterialDocument ToMaterialDocument(TaskMaterial e) => new()
    {
        Name = e.Name,
        Quantity = e.Quantity,
        Unit = e.Unit,
        ProductCode = e.ProductCode,
        Notes = e.Notes
    };

    private static TaskQuantity ToQuantity(TaskQuantityDocument d) => new()
    {
        Key = d.Key,
        Label = d.Label,
        Value = d.Value,
        Unit = d.Unit
    };

    private static TaskQuantityDocument ToQuantityDocument(TaskQuantity e) => new()
    {
        Key = e.Key,
        Label = e.Label,
        Value = e.Value,
        Unit = e.Unit
    };

    public static FieldWorkProfile ToEntity(FieldWorkProfileDocument d) => new()
    {
        Id = d.Id,
        FieldId = d.FieldId,
        ResultYearCreated = d.ResultYearCreated,
        ProfileVersion = d.ProfileVersion,
        OnboardingVersion = d.OnboardingVersion,
        Status = FieldWorkProfileStatusExtensions.FromApiString(d.Status) ?? FieldWorkProfileStatus.Draft,
        ProductionPurpose = ProductionPurposeExtensions.FromApiString(d.ProductionPurpose),
        Irrigation = ToIrrigationEntity(d.Irrigation),
        Pruning = ToPruningEntity(d.Pruning),
        Fertilisation = ToFertilisationEntity(d.Fertilisation),
        GroundCover = ToGroundCoverEntity(d.GroundCover),
        PestManagement = ToPestEntity(d.PestManagement),
        Analysis = ToAnalysisEntity(d.Analysis),
        Harvest = ToHarvestEntity(d.Harvest),
        DefaultAssignments = new DefaultAssignments
        {
            Entries = (d.DefaultAssignments?.Entries ?? [])
                .Select(e => new DefaultAssignmentEntry
                {
                    Category = e.Category,
                    AssigneeUserId = e.AssigneeUserId,
                    IsSelf = e.IsSelf
                })
                .ToList()
        },
        NotificationPreference = new NotificationPreference
        {
            Intensity = NotificationIntensityExtensions.FromApiString(
                d.NotificationPreference?.Intensity),
            AcceptedTaskReminderDaysBefore = d.NotificationPreference?.AcceptedTaskReminderDaysBefore ?? 3
        },
        CurrentYearDeclaredWork = (d.CurrentYearDeclaredWork ?? [])
            .Select(ToDeclaredWorkEntity)
            .ToList(),
        CompletedAt = d.CompletedAt,
        CompletedByUserId = d.CompletedByUserId,
        LastReviewedAt = d.LastReviewedAt,
        CreatedByUserId = d.CreatedByUserId,
        UpdatedByUserId = d.UpdatedByUserId,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };

    public static FieldWorkProfileDocument ToDocument(FieldWorkProfile e) => new()
    {
        Id = e.Id,
        FieldId = e.FieldId,
        ResultYearCreated = e.ResultYearCreated,
        ProfileVersion = e.ProfileVersion,
        OnboardingVersion = e.OnboardingVersion,
        Status = e.Status.ToApiString(),
        ProductionPurpose = e.ProductionPurpose.ToApiString(),
        Irrigation = ToIrrigationDocument(e.Irrigation),
        Pruning = ToPracticeDocument(e.Pruning),
        Fertilisation = ToFertilisationDocument(e.Fertilisation),
        GroundCover = ToGroundCoverDocument(e.GroundCover),
        PestManagement = ToPestDocument(e.PestManagement),
        Analysis = ToAnalysisDocument(e.Analysis),
        Harvest = ToHarvestDocument(e.Harvest),
        DefaultAssignments = new DefaultAssignmentsDocument
        {
            Entries = e.DefaultAssignments.Entries
                .Select(x => new DefaultAssignmentEntryDocument
                {
                    Category = x.Category,
                    AssigneeUserId = x.AssigneeUserId,
                    IsSelf = x.IsSelf
                })
                .ToList()
        },
        NotificationPreference = new NotificationPreferenceDocument
        {
            Intensity = e.NotificationPreference.Intensity.ToApiString(),
            AcceptedTaskReminderDaysBefore = e.NotificationPreference.AcceptedTaskReminderDaysBefore
        },
        CurrentYearDeclaredWork = e.CurrentYearDeclaredWork
            .Select(ToDeclaredWorkDocument)
            .ToList(),
        CompletedAt = e.CompletedAt,
        CompletedByUserId = e.CompletedByUserId,
        LastReviewedAt = e.LastReviewedAt,
        CreatedByUserId = e.CreatedByUserId,
        UpdatedByUserId = e.UpdatedByUserId,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    private static void CopyPractice(PracticeProfileBase target, PracticeProfileDocument source)
    {
        target.PreferenceMode = PreferenceModeExtensions.FromApiString(source.PreferenceMode);
        target.FrequencyType = FrequencyTypeExtensions.FromApiString(source.FrequencyType);
        target.FrequencyValue = source.FrequencyValue;
        target.PreferredMonths = source.PreferredMonths?.ToList() ?? [];
        target.LastPerformedYear = source.LastPerformedYear;
        target.LastPerformedMonth = source.LastPerformedMonth;
        target.DatePrecision = DatePrecisionExtensions.FromApiString(source.DatePrecision);
        target.DefaultAssigneeId = source.DefaultAssigneeId;
        target.UserNotes = source.UserNotes;
        target.Source = PreferenceSourceExtensions.FromApiString(source.Source);
        target.ConfirmedAt = source.ConfirmedAt;
    }

    private static void CopyPractice(PracticeProfileDocument target, PracticeProfileBase source)
    {
        target.PreferenceMode = source.PreferenceMode.ToApiString();
        target.FrequencyType = source.FrequencyType.ToApiString();
        target.FrequencyValue = source.FrequencyValue;
        target.PreferredMonths = source.PreferredMonths.ToList();
        target.LastPerformedYear = source.LastPerformedYear;
        target.LastPerformedMonth = source.LastPerformedMonth;
        target.DatePrecision = source.DatePrecision?.ToApiString();
        target.DefaultAssigneeId = source.DefaultAssigneeId;
        target.UserNotes = source.UserNotes;
        target.Source = source.Source.ToApiString();
        target.ConfirmedAt = source.ConfirmedAt;
    }

    private static PracticeProfileDocument ToPracticeDocument(PracticeProfileBase e)
    {
        var d = new PracticeProfileDocument();
        CopyPractice(d, e);
        return d;
    }

    private static PruningProfile ToPruningEntity(PracticeProfileDocument? d)
    {
        var e = new PruningProfile();
        if (d is not null)
        {
            CopyPractice(e, d);
        }

        return e;
    }

    private static IrrigationProfile ToIrrigationEntity(IrrigationProfileDocument? d)
    {
        var e = new IrrigationProfile();
        if (d is not null)
        {
            CopyPractice(e, d);
            e.Method = IrrigationMethodExtensions.FromApiString(d.Method);
            e.DecisionMaker = WorkDecisionMakerExtensions.FromApiString(d.DecisionMaker);
        }

        return e;
    }

    private static IrrigationProfileDocument ToIrrigationDocument(IrrigationProfile e)
    {
        var d = new IrrigationProfileDocument();
        CopyPractice(d, e);
        d.Method = e.Method.ToApiString();
        d.DecisionMaker = e.DecisionMaker.ToApiString();
        return d;
    }

    private static FertilisationProfile ToFertilisationEntity(FertilisationProfileDocument? d)
    {
        var e = new FertilisationProfile();
        if (d is not null)
        {
            CopyPractice(e, d);
            e.DecisionMaker = WorkDecisionMakerExtensions.FromApiString(d.DecisionMaker);
        }

        return e;
    }

    private static FertilisationProfileDocument ToFertilisationDocument(FertilisationProfile e)
    {
        var d = new FertilisationProfileDocument();
        CopyPractice(d, e);
        d.DecisionMaker = e.DecisionMaker.ToApiString();
        return d;
    }

    private static GroundCoverProfile ToGroundCoverEntity(GroundCoverProfileDocument? d)
    {
        var e = new GroundCoverProfile();
        if (d is not null)
        {
            CopyPractice(e, d);
            e.Methods = (d.Methods ?? []).Select(GroundCoverMethodExtensions.FromApiString).ToList();
        }

        return e;
    }

    private static GroundCoverProfileDocument ToGroundCoverDocument(GroundCoverProfile e)
    {
        var d = new GroundCoverProfileDocument();
        CopyPractice(d, e);
        d.Methods = e.Methods.Select(m => m.ToApiString()).ToList();
        return d;
    }

    private static PestManagementProfile ToPestEntity(PestManagementProfileDocument? d)
    {
        var e = new PestManagementProfile();
        if (d is not null)
        {
            CopyPractice(e, d);
            e.DecisionApproach = PestDecisionApproachExtensions.FromApiString(d.DecisionApproach);
            e.TrapStatus = TrapStatusExtensions.FromApiString(d.TrapStatus);
        }

        return e;
    }

    private static PestManagementProfileDocument ToPestDocument(PestManagementProfile e)
    {
        var d = new PestManagementProfileDocument();
        CopyPractice(d, e);
        d.DecisionApproach = e.DecisionApproach.ToApiString();
        d.TrapStatus = e.TrapStatus.ToApiString();
        return d;
    }

    private static AnalysisProfile ToAnalysisEntity(AnalysisProfileDocument? d)
    {
        var e = new AnalysisProfile();
        if (d is not null)
        {
            CopyPractice(e, d);
            e.Kinds = (d.Kinds ?? []).Select(k => new AnalysisKindEntry
            {
                Kind = AnalysisKindExtensions.FromApiString(k.Kind),
                LastPerformedYear = k.LastPerformedYear,
                DatePrecision = DatePrecisionExtensions.FromApiString(k.DatePrecision) ?? DatePrecision.Year
            }).ToList();
        }

        return e;
    }

    private static AnalysisProfileDocument ToAnalysisDocument(AnalysisProfile e)
    {
        var d = new AnalysisProfileDocument();
        CopyPractice(d, e);
        d.Kinds = e.Kinds.Select(k => new AnalysisKindEntryDocument
        {
            Kind = k.Kind.ToApiString(),
            LastPerformedYear = k.LastPerformedYear,
            DatePrecision = k.DatePrecision?.ToApiString()
        }).ToList();
        return d;
    }

    private static HarvestProfile ToHarvestEntity(HarvestProfileDocument? d)
    {
        var e = new HarvestProfile();
        if (d is not null)
        {
            CopyPractice(e, d);
            e.ExpectedStartMonth = d.ExpectedStartMonth;
            e.Organizer = WorkDecisionMakerExtensions.FromApiString(d.Organizer);
            e.NeedsMillBooking = YesNoUnknownExtensions.FromApiString(d.NeedsMillBooking);
        }

        return e;
    }

    private static HarvestProfileDocument ToHarvestDocument(HarvestProfile e)
    {
        var d = new HarvestProfileDocument();
        CopyPractice(d, e);
        d.ExpectedStartMonth = e.ExpectedStartMonth;
        d.Organizer = e.Organizer.ToApiString();
        d.NeedsMillBooking = e.NeedsMillBooking.ToApiString();
        return d;
    }

    private static CurrentYearDeclaredWorkItem ToDeclaredWorkEntity(CurrentYearDeclaredWorkDocument d) => new()
    {
        Category = d.Category,
        TemplateCode = d.TemplateCode,
        ResultYear = d.ResultYear,
        Completion = DeclaredWorkCompletionExtensions.FromApiString(d.Completion),
        ApproximateDate = d.ApproximateDate is null
            ? null
            : new ApproximateDate
            {
                Year = d.ApproximateDate.Year,
                Month = d.ApproximateDate.Month,
                Day = d.ApproximateDate.Day,
                Precision = DatePrecisionExtensions.FromApiString(d.ApproximateDate.Precision)
                    ?? DatePrecision.Year
            },
        Source = PreferenceSourceExtensions.FromApiString(d.Source)
    };

    private static CurrentYearDeclaredWorkDocument ToDeclaredWorkDocument(CurrentYearDeclaredWorkItem e) => new()
    {
        Category = e.Category,
        TemplateCode = e.TemplateCode,
        ResultYear = e.ResultYear,
        Completion = e.Completion.ToApiString(),
        ApproximateDate = e.ApproximateDate is null
            ? null
            : new ApproximateDateDocument
            {
                Year = e.ApproximateDate.Year,
                Month = e.ApproximateDate.Month,
                Day = e.ApproximateDate.Day,
                Precision = e.ApproximateDate.Precision.ToApiString()
            },
        Source = e.Source.ToApiString()
    };
}
