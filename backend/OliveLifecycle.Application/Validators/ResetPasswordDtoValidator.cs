using FluentValidation;
using OliveLifecycle.Application.DTOs.Auth;
using OliveLifecycle.Core.Security;

namespace OliveLifecycle.Application.Validators;

public class ResetPasswordDtoValidator : AbstractValidator<ResetPasswordDto>
{
    public ResetPasswordDtoValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.Password)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .Must(PasswordPolicy.MeetsComplexity)
            .WithMessage(PasswordPolicy.ComplexityMessage);
    }
}
