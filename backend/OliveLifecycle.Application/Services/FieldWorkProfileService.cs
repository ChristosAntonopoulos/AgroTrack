using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Application.Services;

public interface IFieldWorkProfileService
{
    Task<FieldWorkProfileDto?> GetAsync(
        string fieldId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldWorkProfileDto> CreateDraftAsync(
        string fieldId,
        CreateFieldWorkProfileDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    /// <summary>Resume / save answers. Keeps Draft unless already Active.</summary>
    Task<FieldWorkProfileDto> UpdateAsync(
        string fieldId,
        UpdateFieldWorkProfileDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    Task<FieldWorkProfileDto> ActivateAsync(
        string fieldId,
        ActivateFieldWorkProfileDto? dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Copy practice preferences to other fields. Does not grant field access or financial visibility.
    /// </summary>
    Task<CopyFieldWorkProfileResultDto> CopyAsync(
        string sourceFieldId,
        CopyFieldWorkProfileDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);
}

public class FieldWorkProfileService : IFieldWorkProfileService
{
    private readonly IFieldWorkProfileRepository _profiles;
    private readonly IFieldRepository _fields;
    private readonly IFieldWorkAuthorizationService _auth;
    private readonly IDateTimeProvider _clock;

    public FieldWorkProfileService(
        IFieldWorkProfileRepository profiles,
        IFieldRepository fields,
        IFieldWorkAuthorizationService auth,
        IDateTimeProvider clock)
    {
        _profiles = profiles;
        _fields = fields;
        _auth = auth;
        _clock = clock;
    }

    public async Task<FieldWorkProfileDto?> GetAsync(
        string fieldId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanViewFieldWorkAsync(fieldId, userId, userRole, cancellationToken);
        var profile = await _profiles.GetByFieldIdAsync(fieldId, cancellationToken);
        return profile is null ? null : FieldWorkMapper.ToDto(profile, language);
    }

    public async Task<FieldWorkProfileDto> CreateDraftAsync(
        string fieldId,
        CreateFieldWorkProfileDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanEditWorkProfileAsync(fieldId, userId, userRole, cancellationToken);

        var existing = await _profiles.GetByFieldIdAsync(fieldId, cancellationToken);
        if (existing is not null)
        {
            throw new ValidationException("A field-work profile already exists for this field.");
        }

        // Ensure the field exists (auth already loads it, but create path needs year).
        _ = await _fields.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        var now = _clock.UtcNow;
        var year = dto.ResultYearCreated ?? AthensTime.CalendarYear(now);
        var profile = new FieldWorkProfile
        {
            FieldId = fieldId,
            ResultYearCreated = year,
            ProfileVersion = 1,
            OnboardingVersion = FieldWorkProfile.CurrentOnboardingVersion,
            Status = FieldWorkProfileStatus.Draft,
            ProductionPurpose = ProductionPurpose.Unknown,
            CreatedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _profiles.CreateAsync(profile, cancellationToken);
        return FieldWorkMapper.ToDto(created, language);
    }

    public async Task<FieldWorkProfileDto> UpdateAsync(
        string fieldId,
        UpdateFieldWorkProfileDto dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanEditWorkProfileAsync(fieldId, userId, userRole, cancellationToken);

        var profile = await _profiles.GetByFieldIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field-work profile not found.");

        ApplyUpdate(profile, dto, userId, _clock.UtcNow);
        profile.ProfileVersion += 1;
        // Resume keeps Draft; never auto-activate from update.
        if (profile.Status != FieldWorkProfileStatus.Active)
        {
            profile.Status = FieldWorkProfileStatus.Draft;
        }

        var updated = await _profiles.UpdateAsync(profile, cancellationToken);
        return FieldWorkMapper.ToDto(updated, language);
    }

    public async Task<FieldWorkProfileDto> ActivateAsync(
        string fieldId,
        ActivateFieldWorkProfileDto? dto,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanEditWorkProfileAsync(fieldId, userId, userRole, cancellationToken);
        await _auth.EnsureFieldEligibleForProfileActivationAsync(fieldId, cancellationToken);

        var profile = await _profiles.GetByFieldIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field-work profile not found.");

        var now = _clock.UtcNow;
        profile.Status = FieldWorkProfileStatus.Active;
        profile.CompletedAt ??= now;
        profile.CompletedByUserId ??= userId;
        profile.LastReviewedAt = now;
        profile.UpdatedByUserId = userId;
        profile.UpdatedAt = now;
        profile.ProfileVersion += 1;

        var updated = await _profiles.UpdateAsync(profile, cancellationToken);
        return FieldWorkMapper.ToDto(updated, language);
    }

    public async Task<CopyFieldWorkProfileResultDto> CopyAsync(
        string sourceFieldId,
        CopyFieldWorkProfileDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        await _auth.EnsureCanEditWorkProfileAsync(sourceFieldId, userId, userRole, cancellationToken);

        var source = await _profiles.GetByFieldIdAsync(sourceFieldId, cancellationToken)
            ?? throw new NotFoundException("Field-work profile not found.");

        var targetIds = (dto.TargetFieldIds ?? [])
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.Ordinal)
            .Where(id => !string.Equals(id, sourceFieldId, StringComparison.Ordinal))
            .ToList();

        var result = new CopyFieldWorkProfileResultDto { SourceFieldId = sourceFieldId };
        if (targetIds.Count == 0)
        {
            throw new ValidationException("Select at least one target field.");
        }

        foreach (var targetFieldId in targetIds)
        {
            result.Results.Add(await CopyToTargetAsync(
                source,
                targetFieldId,
                dto,
                userId,
                userRole,
                cancellationToken));
        }

        return result;
    }

    private async Task<CopyFieldWorkProfileTargetResultDto> CopyToTargetAsync(
        FieldWorkProfile source,
        string targetFieldId,
        CopyFieldWorkProfileDto options,
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        var outcome = new CopyFieldWorkProfileTargetResultDto { FieldId = targetFieldId };

        try
        {
            await _auth.EnsureCanEditWorkProfileAsync(targetFieldId, userId, userRole, cancellationToken);
        }
        catch (ForbiddenException ex)
        {
            outcome.ErrorCode = "permission";
            outcome.ErrorMessage = ex.Message;
            return outcome;
        }
        catch (NotFoundException ex)
        {
            outcome.ErrorCode = "not_found";
            outcome.ErrorMessage = ex.Message;
            return outcome;
        }

        var targetField = await _fields.GetByIdAsync(targetFieldId, cancellationToken);
        if (targetField is null)
        {
            outcome.ErrorCode = "not_found";
            outcome.ErrorMessage = "Field not found.";
            return outcome;
        }

        if (targetField.Status == FieldStatus.Draft)
        {
            outcome.ErrorCode = "draft_field";
            outcome.ErrorMessage = "Draft fields cannot receive a copied work profile.";
            return outcome;
        }

        if (targetField.Status == FieldStatus.Archived)
        {
            outcome.ErrorCode = "archived_field";
            outcome.ErrorMessage = "Archived fields cannot receive a copied work profile.";
            return outcome;
        }

        var now = _clock.UtcNow;
        var existing = await _profiles.GetByFieldIdAsync(targetFieldId, cancellationToken);
        var isNew = existing is null;
        var target = existing ?? new FieldWorkProfile
        {
            FieldId = targetFieldId,
            ResultYearCreated = AthensTime.CalendarYear(now),
            ProfileVersion = 1,
            OnboardingVersion = FieldWorkProfile.CurrentOnboardingVersion,
            Status = FieldWorkProfileStatus.Draft,
            CreatedByUserId = userId,
            CreatedAt = now
        };

        var skipped = ApplyCopiedSettings(source, target, targetField, options, userId, now);
        outcome.SkippedAssignmentUserIds = skipped;

        FieldWorkProfile saved;
        if (isNew)
        {
            saved = await _profiles.CreateAsync(target, cancellationToken);
        }
        else
        {
            target.ProfileVersion += 1;
            saved = await _profiles.UpdateAsync(target, cancellationToken);
        }

        outcome.Success = true;
        outcome.ProfileId = saved.Id;
        outcome.ProfileStatus = saved.Status.ToApiString();
        return outcome;
    }

    /// <summary>
    /// Copies practice prefs. Irrigation / last-performed / assignments require explicit flags.
    /// Never copies CurrentYearDeclaredWork. Never grants field access.
    /// </summary>
    private static List<string> ApplyCopiedSettings(
        FieldWorkProfile source,
        FieldWorkProfile target,
        Field targetField,
        CopyFieldWorkProfileDto options,
        string userId,
        DateTime now)
    {
        target.ProductionPurpose = source.ProductionPurpose;
        target.NotificationPreference = CloneNotification(source.NotificationPreference);

        target.Pruning = ClonePruning(source.Pruning, options.CopyLastPerformed, options.CopyAssignments);
        target.Fertilisation = CloneFertilisation(source.Fertilisation, options.CopyLastPerformed, options.CopyAssignments);
        target.GroundCover = CloneGroundCover(source.GroundCover, options.CopyLastPerformed, options.CopyAssignments);
        target.PestManagement = ClonePest(source.PestManagement, options.CopyLastPerformed, options.CopyAssignments);
        target.Analysis = CloneAnalysis(source.Analysis, options.CopyLastPerformed, options.CopyAssignments);
        target.Harvest = CloneHarvest(source.Harvest, options.CopyLastPerformed, options.CopyAssignments);

        if (options.CopyIrrigation)
        {
            target.Irrigation = CloneIrrigation(source.Irrigation, options.CopyLastPerformed, options.CopyAssignments);
        }

        var skipped = new List<string>();
        if (options.CopyAssignments)
        {
            target.DefaultAssignments = FilterAssignmentsForTarget(
                source.DefaultAssignments,
                targetField,
                userId,
                skipped);
        }

        target.UpdatedByUserId = userId;
        target.UpdatedAt = now;
        target.LastReviewedAt = now;
        return skipped;
    }

    private static DefaultAssignments FilterAssignmentsForTarget(
        DefaultAssignments source,
        Field targetField,
        string actingUserId,
        List<string> skipped)
    {
        var entries = new List<DefaultAssignmentEntry>();
        foreach (var entry in source.Entries)
        {
            if (entry.IsSelf || string.IsNullOrWhiteSpace(entry.AssigneeUserId))
            {
                entries.Add(new DefaultAssignmentEntry
                {
                    Category = entry.Category,
                    IsSelf = entry.IsSelf,
                    AssigneeUserId = entry.IsSelf ? null : entry.AssigneeUserId
                });
                continue;
            }

            var assigneeId = entry.AssigneeUserId;
            var allowed = string.Equals(assigneeId, targetField.OwnerId, StringComparison.Ordinal)
                || string.Equals(assigneeId, actingUserId, StringComparison.Ordinal)
                || FieldMembershipSync.IsMember(targetField, assigneeId);

            if (!allowed)
            {
                skipped.Add(assigneeId);
                entries.Add(new DefaultAssignmentEntry
                {
                    Category = entry.Category,
                    IsSelf = false,
                    AssigneeUserId = null
                });
                continue;
            }

            entries.Add(new DefaultAssignmentEntry
            {
                Category = entry.Category,
                IsSelf = false,
                AssigneeUserId = assigneeId
            });
        }

        return new DefaultAssignments { Entries = entries };
    }

    private static NotificationPreference CloneNotification(NotificationPreference source) => new()
    {
        Intensity = source.Intensity,
        AcceptedTaskReminderDaysBefore = source.AcceptedTaskReminderDaysBefore
    };

    private static void CopyPracticeBase(
        PracticeProfileBase source,
        PracticeProfileBase target,
        bool copyLastPerformed,
        bool copyAssignee)
    {
        target.PreferenceMode = source.PreferenceMode;
        target.FrequencyType = source.FrequencyType;
        target.FrequencyValue = source.FrequencyValue;
        target.PreferredMonths = [.. source.PreferredMonths];
        target.UserNotes = source.UserNotes;
        target.Source = source.Source == PreferenceSource.Unknown
            ? PreferenceSource.UserDeclaredDuringOnboarding
            : source.Source;
        target.ConfirmedAt = source.ConfirmedAt;

        if (copyLastPerformed)
        {
            target.LastPerformedYear = source.LastPerformedYear;
            target.LastPerformedMonth = source.LastPerformedMonth;
            target.DatePrecision = source.DatePrecision;
        }
        else
        {
            target.LastPerformedYear = null;
            target.LastPerformedMonth = null;
            target.DatePrecision = null;
        }

        target.DefaultAssigneeId = copyAssignee ? source.DefaultAssigneeId : null;
    }

    private static IrrigationProfile CloneIrrigation(
        IrrigationProfile source, bool copyLast, bool copyAssignee)
    {
        var target = new IrrigationProfile
        {
            Method = source.Method,
            DecisionMaker = source.DecisionMaker
        };
        CopyPracticeBase(source, target, copyLast, copyAssignee);
        return target;
    }

    private static PruningProfile ClonePruning(
        PruningProfile source, bool copyLast, bool copyAssignee)
    {
        var target = new PruningProfile();
        CopyPracticeBase(source, target, copyLast, copyAssignee);
        return target;
    }

    private static FertilisationProfile CloneFertilisation(
        FertilisationProfile source, bool copyLast, bool copyAssignee)
    {
        var target = new FertilisationProfile { DecisionMaker = source.DecisionMaker };
        CopyPracticeBase(source, target, copyLast, copyAssignee);
        return target;
    }

    private static GroundCoverProfile CloneGroundCover(
        GroundCoverProfile source, bool copyLast, bool copyAssignee)
    {
        var target = new GroundCoverProfile { Methods = [.. source.Methods] };
        CopyPracticeBase(source, target, copyLast, copyAssignee);
        return target;
    }

    private static PestManagementProfile ClonePest(
        PestManagementProfile source, bool copyLast, bool copyAssignee)
    {
        var target = new PestManagementProfile
        {
            DecisionApproach = source.DecisionApproach,
            TrapStatus = source.TrapStatus
        };
        CopyPracticeBase(source, target, copyLast, copyAssignee);
        return target;
    }

    private static AnalysisProfile CloneAnalysis(
        AnalysisProfile source, bool copyLast, bool copyAssignee)
    {
        var target = new AnalysisProfile
        {
            Kinds = source.Kinds.Select(k => new AnalysisKindEntry
            {
                Kind = k.Kind,
                LastPerformedYear = copyLast ? k.LastPerformedYear : null,
                DatePrecision = copyLast ? k.DatePrecision : DatePrecision.Year
            }).ToList()
        };
        CopyPracticeBase(source, target, copyLast, copyAssignee);
        return target;
    }

    private static HarvestProfile CloneHarvest(
        HarvestProfile source, bool copyLast, bool copyAssignee)
    {
        var target = new HarvestProfile
        {
            ExpectedStartMonth = source.ExpectedStartMonth,
            Organizer = source.Organizer,
            NeedsMillBooking = source.NeedsMillBooking
        };
        CopyPracticeBase(source, target, copyLast, copyAssignee);
        return target;
    }

    private static void ApplyUpdate(
        FieldWorkProfile profile,
        UpdateFieldWorkProfileDto dto,
        string userId,
        DateTime now)
    {
        if (dto.ProductionPurpose is not null)
        {
            profile.ProductionPurpose = ProductionPurposeExtensions.FromApiString(dto.ProductionPurpose);
        }

        if (dto.Irrigation is not null)
        {
            ApplyPractice(profile.Irrigation, dto.Irrigation, now);
            if (dto.Irrigation.Method is not null)
            {
                profile.Irrigation.Method = IrrigationMethodExtensions.FromApiString(dto.Irrigation.Method);
            }

            if (dto.Irrigation.DecisionMaker is not null)
            {
                profile.Irrigation.DecisionMaker =
                    WorkDecisionMakerExtensions.FromApiString(dto.Irrigation.DecisionMaker);
            }
        }

        if (dto.Pruning is not null)
        {
            ApplyPractice(profile.Pruning, dto.Pruning, now);
        }

        if (dto.Fertilisation is not null)
        {
            ApplyPractice(profile.Fertilisation, dto.Fertilisation, now);
            if (dto.Fertilisation.DecisionMaker is not null)
            {
                profile.Fertilisation.DecisionMaker =
                    WorkDecisionMakerExtensions.FromApiString(dto.Fertilisation.DecisionMaker);
            }
        }

        if (dto.GroundCover is not null)
        {
            ApplyPractice(profile.GroundCover, dto.GroundCover, now);
            if (dto.GroundCover.Methods is not null)
            {
                profile.GroundCover.Methods = dto.GroundCover.Methods
                    .Select(GroundCoverMethodExtensions.FromApiString)
                    .ToList();
            }
        }

        if (dto.PestManagement is not null)
        {
            ApplyPractice(profile.PestManagement, dto.PestManagement, now);
            if (dto.PestManagement.DecisionApproach is not null)
            {
                profile.PestManagement.DecisionApproach =
                    PestDecisionApproachExtensions.FromApiString(dto.PestManagement.DecisionApproach);
            }

            if (dto.PestManagement.TrapStatus is not null)
            {
                profile.PestManagement.TrapStatus =
                    TrapStatusExtensions.FromApiString(dto.PestManagement.TrapStatus);
            }
        }

        if (dto.Analysis is not null)
        {
            ApplyPractice(profile.Analysis, dto.Analysis, now);
            if (dto.Analysis.Kinds is not null)
            {
                profile.Analysis.Kinds = dto.Analysis.Kinds.Select(k => new AnalysisKindEntry
                {
                    Kind = AnalysisKindExtensions.FromApiString(k.Kind),
                    LastPerformedYear = k.LastPerformedYear,
                    DatePrecision = DatePrecisionExtensions.FromApiString(k.DatePrecision)
                        ?? DatePrecision.Year
                }).ToList();
            }
        }

        if (dto.Harvest is not null)
        {
            ApplyPractice(profile.Harvest, dto.Harvest, now);
            if (dto.Harvest.ClearExpectedStartMonth)
            {
                profile.Harvest.ExpectedStartMonth = null;
            }
            else if (dto.Harvest.ExpectedStartMonth.HasValue)
            {
                profile.Harvest.ExpectedStartMonth = dto.Harvest.ExpectedStartMonth;
            }

            if (dto.Harvest.Organizer is not null)
            {
                profile.Harvest.Organizer = WorkDecisionMakerExtensions.FromApiString(dto.Harvest.Organizer);
            }

            if (dto.Harvest.NeedsMillBooking is not null)
            {
                profile.Harvest.NeedsMillBooking =
                    YesNoUnknownExtensions.FromApiString(dto.Harvest.NeedsMillBooking);
            }
        }

        if (dto.DefaultAssignments is not null)
        {
            profile.DefaultAssignments = new DefaultAssignments
            {
                Entries = dto.DefaultAssignments.Entries
                    .Select(e => new DefaultAssignmentEntry
                    {
                        Category = e.Category,
                        AssigneeUserId = e.AssigneeUserId,
                        IsSelf = e.IsSelf
                    })
                    .ToList()
            };
        }

        if (dto.NotificationPreference is not null)
        {
            if (dto.NotificationPreference.Intensity is not null)
            {
                profile.NotificationPreference.Intensity =
                    NotificationIntensityExtensions.FromApiString(dto.NotificationPreference.Intensity);
            }

            if (dto.NotificationPreference.AcceptedTaskReminderDaysBefore.HasValue)
            {
                profile.NotificationPreference.AcceptedTaskReminderDaysBefore =
                    dto.NotificationPreference.AcceptedTaskReminderDaysBefore.Value;
            }
        }

        if (dto.CurrentYearDeclaredWork is not null)
        {
            profile.CurrentYearDeclaredWork = dto.CurrentYearDeclaredWork
                .Select(ToDeclaredWorkEntity)
                .ToList();
        }

        profile.UpdatedByUserId = userId;
        profile.UpdatedAt = now;
    }

    private static void ApplyPractice(
        PracticeProfileBase target,
        UpdatePracticeProfileDto source,
        DateTime now)
    {
        if (source.PreferenceMode is not null)
        {
            // Explicit "unknown" stays Unknown — never coerce away.
            target.PreferenceMode = PreferenceModeExtensions.FromApiString(source.PreferenceMode);
        }

        if (source.FrequencyType is not null)
        {
            target.FrequencyType = FrequencyTypeExtensions.FromApiString(source.FrequencyType);
        }

        if (source.ClearFrequencyValue)
        {
            target.FrequencyValue = null;
        }
        else if (source.FrequencyValue.HasValue)
        {
            target.FrequencyValue = source.FrequencyValue;
        }

        if (source.PreferredMonths is not null)
        {
            target.PreferredMonths = source.PreferredMonths
                .Where(m => m is >= 1 and <= 12)
                .Distinct()
                .OrderBy(m => m)
                .ToList();
        }

        if (source.ClearLastPerformedYear)
        {
            target.LastPerformedYear = null;
        }
        else if (source.LastPerformedYear.HasValue)
        {
            target.LastPerformedYear = source.LastPerformedYear;
        }

        if (source.ClearLastPerformedMonth)
        {
            target.LastPerformedMonth = null;
        }
        else if (source.LastPerformedMonth.HasValue)
        {
            target.LastPerformedMonth = source.LastPerformedMonth;
        }

        if (source.ClearDatePrecision)
        {
            target.DatePrecision = null;
        }
        else if (source.DatePrecision is not null)
        {
            target.DatePrecision = DatePrecisionExtensions.FromApiString(source.DatePrecision)
                ?? target.DatePrecision;
        }

        if (source.ClearDefaultAssigneeId)
        {
            target.DefaultAssigneeId = null;
        }
        else if (source.DefaultAssigneeId is not null)
        {
            target.DefaultAssigneeId = source.DefaultAssigneeId;
        }

        if (source.UserNotes is not null)
        {
            target.UserNotes = source.UserNotes;
        }

        if (source.Source is not null)
        {
            target.Source = PreferenceSourceExtensions.FromApiString(source.Source);
        }
        else if (target.Source == PreferenceSource.Unknown
                 && (source.PreferenceMode is not null || source.FrequencyType is not null))
        {
            target.Source = PreferenceSource.UserDeclaredDuringOnboarding;
        }

        if (source.ConfirmedAt.HasValue)
        {
            target.ConfirmedAt = source.ConfirmedAt.Value.ToUniversalTime();
        }
        else if (source.PreferenceMode is not null
                 && target.PreferenceMode != PreferenceMode.Unknown
                 && target.ConfirmedAt is null)
        {
            target.ConfirmedAt = now;
        }
    }

    private static CurrentYearDeclaredWorkItem ToDeclaredWorkEntity(CurrentYearDeclaredWorkDto dto)
    {
        ApproximateDate? approx = null;
        if (dto.ApproximateDate is not null)
        {
            var precision = DatePrecisionExtensions.FromApiString(dto.ApproximateDate.Precision)
                ?? DatePrecision.Year;
            approx = new ApproximateDate
            {
                Year = dto.ApproximateDate.Year,
                Month = precision is DatePrecision.Month or DatePrecision.Exact
                    ? dto.ApproximateDate.Month
                    : null,
                Day = precision == DatePrecision.Exact ? dto.ApproximateDate.Day : null,
                Precision = precision
            };
        }

        return new CurrentYearDeclaredWorkItem
        {
            Category = dto.Category,
            TemplateCode = dto.TemplateCode,
            ResultYear = dto.ResultYear,
            Completion = DeclaredWorkCompletionExtensions.FromApiString(dto.Completion),
            ApproximateDate = approx,
            Source = PreferenceSourceExtensions.FromApiString(dto.Source)
        };
    }
}
