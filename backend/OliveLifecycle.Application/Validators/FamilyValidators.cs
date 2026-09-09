using FluentValidation;
using OliveLifecycle.Application.DTOs.Family;
using OliveLifecycle.Core;

namespace OliveLifecycle.Application.Validators;

public class CreateFamilyInviteDtoValidator : AbstractValidator<CreateFamilyInviteDto>
{
    public CreateFamilyInviteDtoValidator()
    {
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(120);
        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.Phone) || !string.IsNullOrWhiteSpace(x.Email))
            .WithMessage("Phone or email is required.");
        RuleFor(x => x.Phone).MaximumLength(40).When(x => x.Phone != null);
        RuleFor(x => x.Email).EmailAddress().MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.AccessLevel)
            .Must(v => string.IsNullOrWhiteSpace(v) || FamilyAccessLevels.IsKnown(v))
            .WithMessage("Access level must be view, help, or work.");
        RuleFor(x => x.Modules)
            .Must(mods => mods == null || mods.All(m => string.IsNullOrWhiteSpace(m) || FamilyModules.IsKnown(m)))
            .WithMessage("One or more modules are invalid.");
        RuleFor(x => x.Modules)
            .Must(mods =>
            {
                if (mods == null || mods.Count == 0)
                {
                    return true;
                }

                return mods.Any(m => !string.IsNullOrWhiteSpace(m) && FamilyModules.IsKnown(m));
            })
            .WithMessage("Select at least one part they can access.");
    }
}

public class UpdateFamilyMemberDtoValidator : AbstractValidator<UpdateFamilyMemberDto>
{
    public UpdateFamilyMemberDtoValidator()
    {
        RuleFor(x => x.DisplayName).MaximumLength(120).When(x => x.DisplayName != null);
        RuleFor(x => x.Phone).MaximumLength(40).When(x => x.Phone != null);
        RuleFor(x => x.Email).EmailAddress().MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.AccessLevel)
            .Must(v => v is null || FamilyAccessLevels.IsKnown(v))
            .WithMessage("Access level must be view, help, or work.");
        RuleFor(x => x.Modules)
            .Must(mods => mods == null || mods.All(m => string.IsNullOrWhiteSpace(m) || FamilyModules.IsKnown(m)))
            .WithMessage("One or more modules are invalid.");
    }
}
