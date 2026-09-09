using FluentValidation;
using OliveLifecycle.Application.DTOs.Partners;

namespace OliveLifecycle.Application.Validators;

public class UpsertServiceProfileDtoValidator : AbstractValidator<UpsertServiceProfileDto>
{
    public UpsertServiceProfileDtoValidator()
    {
        RuleFor(x => x.DisplayName).MaximumLength(120).When(x => x.DisplayName != null);
        RuleFor(x => x.ShortDescription).MaximumLength(600).When(x => x.ShortDescription != null);
        RuleFor(x => x.BusinessName).MaximumLength(160).When(x => x.BusinessName != null);
        RuleFor(x => x.Equipment).MaximumLength(400).When(x => x.Equipment != null);
        RuleFor(x => x.BaseAreaLabel).MaximumLength(160).When(x => x.BaseAreaLabel != null);
        RuleFor(x => x.PhoneNumber).MaximumLength(40).When(x => x.PhoneNumber != null);
        RuleFor(x => x.PricingNote).MaximumLength(200).When(x => x.PricingNote != null);
        RuleFor(x => x.PhotoUrl).MaximumLength(500).When(x => x.PhotoUrl != null);
        RuleFor(x => x.ServiceRadiusKm)
            .InclusiveBetween(1, 500)
            .When(x => x.ServiceRadiusKm.HasValue);
        RuleFor(x => x.ExperienceYears)
            .InclusiveBetween(0, 80)
            .When(x => x.ExperienceYears.HasValue);
        RuleFor(x => x.CrewSize)
            .InclusiveBetween(1, 200)
            .When(x => x.CrewSize.HasValue);
        RuleFor(x => x.MillOperatingPeriod).MaximumLength(80).When(x => x.MillOperatingPeriod != null);
        RuleFor(x => x.MillProcessingMethod).MaximumLength(80).When(x => x.MillProcessingMethod != null);
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90).When(x => x.Latitude.HasValue);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180).When(x => x.Longitude.HasValue);
        RuleFor(x => x.ProviderKind)
            .Must(v => v is null || v is "Individual" or "Team" or "Business")
            .WithMessage("Provider kind must be Individual, Team, or Business.");
        RuleFor(x => x.Availability)
            .Must(v => v is null || v is "Available" or "Limited" or "Unavailable")
            .WithMessage("Availability must be Available, Limited, or Unavailable.");
        RuleFor(x => x.ContactPreference)
            .Must(v => v is null || v is "InApp" or "Phone" or "Both")
            .WithMessage("Contact preference must be InApp, Phone, or Both.");
        RuleFor(x => x.ServiceCategoryIds)
            .Must(ids => ids == null || ids.Count <= 40)
            .WithMessage("Too many service categories.");
    }
}

public class CreatePartnerContactDtoValidator : AbstractValidator<CreatePartnerContactDto>
{
    public CreatePartnerContactDtoValidator()
    {
        RuleFor(x => x.ServiceCategoryId).NotEmpty();
        RuleFor(x => x.Message).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.FieldId).MaximumLength(50).When(x => x.FieldId != null);
        RuleFor(x => x.TaskId).MaximumLength(50).When(x => x.TaskId != null);
    }
}

public class UpdateServiceContactStatusDtoValidator : AbstractValidator<UpdateServiceContactStatusDto>
{
    public UpdateServiceContactStatusDtoValidator()
    {
        RuleFor(x => x.Status)
            .NotEmpty()
            .Must(s => s is "Viewed" or "Accepted" or "Declined" or "Closed")
            .WithMessage("Status must be Viewed, Accepted, Declined, or Closed.");
    }
}

public class UpsertSavedContactDtoValidator : AbstractValidator<UpsertSavedContactDto>
{
    public UpsertSavedContactDtoValidator()
    {
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Phone).MaximumLength(40).When(x => x.Phone != null);
        RuleFor(x => x.Email).MaximumLength(160).When(x => x.Email != null);
        RuleFor(x => x.Notes).MaximumLength(2000).When(x => x.Notes != null);
        RuleFor(x => x.LinkedUserId).MaximumLength(50).When(x => x.LinkedUserId != null);
        RuleFor(x => x.Source)
            .Must(v => v is null || v is "Manual" or "PhoneBook")
            .WithMessage("Source must be Manual or PhoneBook.");
        RuleFor(x => x.ServiceCategoryIds)
            .Must(ids => ids == null || ids.Count <= 20)
            .WithMessage("Too many service categories.");
        RuleFor(x => x.FieldIds)
            .Must(ids => ids == null || ids.Count <= 50)
            .WithMessage("Too many fields.");
        RuleForEach(x => x.ServiceCategoryIds).MaximumLength(50).When(x => x.ServiceCategoryIds != null);
        RuleForEach(x => x.FieldIds).MaximumLength(50).When(x => x.FieldIds != null);
    }
}
