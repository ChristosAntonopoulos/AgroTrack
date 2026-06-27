using FluentValidation;
using OliveLifecycle.Application.DTOs.Field;

namespace OliveLifecycle.Application.Validators;

public class CreateFieldDtoValidator : AbstractValidator<CreateFieldDto>
{
    public CreateFieldDtoValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Area).GreaterThan(0);
    }
}
