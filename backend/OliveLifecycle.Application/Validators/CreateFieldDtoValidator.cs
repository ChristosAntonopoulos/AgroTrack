using FluentValidation;
using OliveLifecycle.Application.DTOs.Field;

namespace OliveLifecycle.Application.Validators;

public class CreateFieldDtoValidator : AbstractValidator<CreateFieldDto>
{
    public CreateFieldDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MinimumLength(2).MaximumLength(80);
        RuleFor(x => x.Area).GreaterThanOrEqualTo(0)
            .When(x => x.Boundary == null);
        RuleFor(x => x.TreeCount).GreaterThanOrEqualTo(0).When(x => x.TreeCount.HasValue);
    }
}
