using FluentValidation;
using OliveLifecycle.Application.DTOs.Task;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Validators;

public class CreateTaskDtoValidator : AbstractValidator<CreateTaskDto>
{
    public CreateTaskDtoValidator()
    {
        RuleFor(x => x.FieldId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Type).NotEmpty();
        RuleFor(x => x.LifecycleYear)
            .Must(year => string.IsNullOrWhiteSpace(year) || year is "low" or "high")
            .WithMessage("Lifecycle year must be low or high.");
        RuleFor(x => x.HarvestPhase)
            .Must(phase => HarvestPhaseExtensions.FromApiString(phase) != null || string.IsNullOrWhiteSpace(phase))
            .WithMessage("Harvest phase must be prepare, daily, or final.");
    }
}
