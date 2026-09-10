using FluentValidation;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Validators;

public class CreateFieldTaskDtoValidator : AbstractValidator<CreateFieldTaskDto>
{
    public CreateFieldTaskDtoValidator()
    {
        RuleFor(x => x.FieldId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.EstimatedCost)
            .GreaterThan(0)
            .When(x => x.EstimatedCost.HasValue);
        RuleFor(x => x.ResultYear)
            .InclusiveBetween(2000, 2100)
            .When(x => x.ResultYear.HasValue);
    }
}

public class UpdateFieldTaskDtoValidator : AbstractValidator<UpdateFieldTaskDto>
{
    public UpdateFieldTaskDtoValidator()
    {
        RuleFor(x => x.Title).MaximumLength(300).When(x => x.Title != null);
        RuleFor(x => x.EstimatedCost)
            .GreaterThan(0)
            .When(x => x.EstimatedCost.HasValue);
        RuleFor(x => x.ResultYear)
            .InclusiveBetween(2000, 2100)
            .When(x => x.ResultYear.HasValue);
    }
}

public class RescheduleFieldTaskDtoValidator : AbstractValidator<RescheduleFieldTaskDto>
{
    public RescheduleFieldTaskDtoValidator()
    {
        RuleFor(x => x.PlannedStart).NotEmpty();
        RuleFor(x => x.ResultYear)
            .InclusiveBetween(2000, 2100)
            .When(x => x.ResultYear.HasValue);
    }
}

public class CompleteFieldTaskDtoValidator : AbstractValidator<CompleteFieldTaskDto>
{
    public CompleteFieldTaskDtoValidator()
    {
        RuleFor(x => x.Outcome)
            .Must(o => TaskExecutionOutcomeExtensions.FromApiString(o) != null)
            .WithMessage("Outcome must be completed, partially_completed, or not_done.");
    }
}

public class AcceptTaskProposalDtoValidator : AbstractValidator<AcceptTaskProposalDto>
{
    public AcceptTaskProposalDtoValidator()
    {
        RuleFor(x => x.ResultYear)
            .InclusiveBetween(2000, 2100)
            .When(x => x.ResultYear.HasValue);
    }
}

public class DismissTaskProposalDtoValidator : AbstractValidator<DismissTaskProposalDto>
{
    public DismissTaskProposalDtoValidator()
    {
        RuleFor(x => x.Decision)
            .Must(d =>
            {
                var decision = TaskProposalDecisionExtensions.FromApiString(d);
                return decision is TaskProposalDecision.NotForThisField or TaskProposalDecision.DismissForYear;
            })
            .WithMessage("Decision must be not_for_this_field or dismiss_for_year.");
    }
}

public class CreateFieldPhenologyObservationDtoValidator : AbstractValidator<CreateFieldPhenologyObservationDto>
{
    public CreateFieldPhenologyObservationDtoValidator()
    {
        RuleFor(x => x.StageCode).NotEmpty();
        RuleFor(x => x.StageCode)
            .Must(code => OliveBbchStageExtensions.FromApiString(code) != OliveBbchStage.Unknown
                          || string.Equals(code, "unknown", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Stage code must be a known olive BBCH range or unknown.");
    }
}

public class UpdateFieldWorkProfileDtoValidator : AbstractValidator<UpdateFieldWorkProfileDto>
{
    public UpdateFieldWorkProfileDtoValidator()
    {
        RuleFor(x => x.ProductionPurpose)
            .Must(v => v is null || IsKnownProductionPurpose(v))
            .WithMessage("ProductionPurpose must be olive_oil, table_olives, both, or unknown.");

        RuleForEach(x => x.CurrentYearDeclaredWork!)
            .ChildRules(item =>
            {
                item.RuleFor(i => i.Category).NotEmpty();
                item.RuleFor(i => i.ResultYear).InclusiveBetween(2000, 2100);
                item.RuleFor(i => i.ApproximateDate!.Month)
                    .InclusiveBetween(1, 12)
                    .When(i => i.ApproximateDate?.Month is not null);
                item.RuleFor(i => i.ApproximateDate!.Day)
                    .InclusiveBetween(1, 31)
                    .When(i => i.ApproximateDate?.Day is not null);
            })
            .When(x => x.CurrentYearDeclaredWork is not null);

        When(x => x.Harvest?.ExpectedStartMonth is not null, () =>
        {
            RuleFor(x => x.Harvest!.ExpectedStartMonth!.Value).InclusiveBetween(1, 12);
        });

        When(x => x.NotificationPreference?.AcceptedTaskReminderDaysBefore is not null, () =>
        {
            RuleFor(x => x.NotificationPreference!.AcceptedTaskReminderDaysBefore!.Value)
                .InclusiveBetween(0, 30);
        });
    }

    private static bool IsKnownProductionPurpose(string value) =>
        value.Trim().ToLowerInvariant() is "olive_oil" or "table_olives" or "both" or "unknown";
}

public class CreateFieldWorkProfileDtoValidator : AbstractValidator<CreateFieldWorkProfileDto>
{
    public CreateFieldWorkProfileDtoValidator()
    {
        RuleFor(x => x.ResultYearCreated)
            .InclusiveBetween(2000, 2100)
            .When(x => x.ResultYearCreated.HasValue);
    }
}
