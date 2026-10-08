using FluentValidation;
using OliveLifecycle.Application.DTOs.User;
using OliveLifecycle.Core.Security;

namespace OliveLifecycle.Application.Validators;

public class ChangePasswordDtoValidator : AbstractValidator<ChangePasswordDto>
{
    public ChangePasswordDtoValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .Must(PasswordPolicy.MeetsComplexity)
            .WithMessage(PasswordPolicy.ComplexityMessage);
    }
}
