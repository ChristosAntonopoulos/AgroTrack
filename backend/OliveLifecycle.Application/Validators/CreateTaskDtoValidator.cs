using FluentValidation;
using OliveLifecycle.Application.DTOs.Task;

namespace OliveLifecycle.Application.Validators;

public class CreateTaskDtoValidator : AbstractValidator<CreateTaskDto>
{
    public CreateTaskDtoValidator()
    {
        RuleFor(x => x.FieldId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Type).NotEmpty();
        RuleFor(x => x.LifecycleYear).NotEmpty();
    }
}
