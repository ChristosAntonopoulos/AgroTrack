using FluentValidation;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Validators;

public class CreateFinancialEntryDtoValidator : AbstractValidator<CreateFinancialEntryDto>
{
    public CreateFinancialEntryDtoValidator()
    {
        RuleFor(x => x.FieldId).NotEmpty();
        RuleFor(x => x.Description).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Notes).MaximumLength(1000);
        RuleFor(x => x.Unit).MaximumLength(40);
        RuleFor(x => x.Currency)
            .Length(3)
            .When(x => !string.IsNullOrWhiteSpace(x.Currency));
        RuleFor(x => x.Amount)
            .GreaterThan(0)
            .When(x => x.Amount.HasValue);
        RuleFor(x => x.Quantity)
            .GreaterThan(0)
            .When(x => x.Quantity.HasValue);
        RuleFor(x => x.UnitPrice)
            .GreaterThan(0)
            .When(x => x.UnitPrice.HasValue);
        RuleFor(x => x)
            .Must(x => (x.Amount.HasValue && x.Amount > 0) || (x.Quantity.HasValue && x.UnitPrice.HasValue))
            .WithMessage("Provide an amount, or quantity and unit price.");
        RuleFor(x => x.Bucket)
            .Must(v => FinancialCategoryBucketExtensions.FromApiString(v).HasValue)
            .When(x => !string.IsNullOrWhiteSpace(x.Bucket))
            .WithMessage("Bucket must be labor, inputs, harvest, or other.");
        RuleFor(x => x.Category)
            .Must(v => FinancialCategoryExtensions.FromApiString(v).HasValue)
            .When(x => !string.IsNullOrWhiteSpace(x.Category))
            .WithMessage("Unknown expense category.");
        RuleFor(x => x.Kind)
            .Must(v => v is null || v.Equals("expense", StringComparison.OrdinalIgnoreCase) || v.Equals("income", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Kind must be expense or income.");
    }
}

public class UpdateFinancialEntryDtoValidator : AbstractValidator<UpdateFinancialEntryDto>
{
    public UpdateFinancialEntryDtoValidator()
    {
        RuleFor(x => x.Description).MaximumLength(300).When(x => x.Description != null);
        RuleFor(x => x.Notes).MaximumLength(1000);
        RuleFor(x => x.Unit).MaximumLength(40);
        RuleFor(x => x.Amount).GreaterThan(0).When(x => x.Amount.HasValue);
        RuleFor(x => x.Quantity).GreaterThan(0).When(x => x.Quantity.HasValue);
        RuleFor(x => x.UnitPrice).GreaterThan(0).When(x => x.UnitPrice.HasValue);
        RuleFor(x => x.Bucket)
            .Must(v => FinancialCategoryBucketExtensions.FromApiString(v).HasValue)
            .When(x => !string.IsNullOrWhiteSpace(x.Bucket))
            .WithMessage("Bucket must be labor, inputs, harvest, or other.");
        RuleFor(x => x.Category)
            .Must(v => FinancialCategoryExtensions.FromApiString(v).HasValue)
            .When(x => !string.IsNullOrWhiteSpace(x.Category))
            .WithMessage("Unknown expense category.");
    }
}
