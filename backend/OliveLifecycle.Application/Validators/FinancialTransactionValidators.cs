using FluentValidation;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Validators;

public class CreateFinancialTransactionDtoValidator : AbstractValidator<CreateFinancialTransactionDto>
{
    public CreateFinancialTransactionDtoValidator()
    {
        RuleFor(x => x.Type)
            .Must(v => FinancialTransactionTypeExtensions.FromApiString(v).HasValue)
            .WithMessage("Type must be income or expense.");
        RuleFor(x => x.Amount).GreaterThan(0).When(x =>
            x.Amount.HasValue &&
            !string.Equals(x.CalculationMode, "quantity_times_unit_price", StringComparison.OrdinalIgnoreCase));
        RuleFor(x => x.Quantity).GreaterThan(0).When(x => x.Quantity.HasValue);
        RuleFor(x => x.UnitPrice).GreaterThan(0).When(x => x.UnitPrice.HasValue);
        RuleFor(x => x.Currency)
            .Must(v => string.IsNullOrWhiteSpace(v) || v.Trim().Equals("EUR", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Only EUR is supported.");
        RuleFor(x => x.Description).MaximumLength(300);
        RuleFor(x => x.Notes).MaximumLength(2000);
        RuleFor(x => x.PaymentMethod).MaximumLength(80);
        RuleFor(x => x.CounterpartyName).MaximumLength(200);
        RuleFor(x => x.IdempotencyKey).MaximumLength(120);
        RuleFor(x => x.Category)
            .Must(v => string.IsNullOrWhiteSpace(v) || FinancialTransactionCategoryExtensions.FromApiString(v).HasValue)
            .WithMessage("Unknown category.");
        RuleFor(x => x.SourceType)
            .Must(v => string.IsNullOrWhiteSpace(v) || FinancialTransactionSourceTypeExtensions.FromApiString(v).HasValue)
            .WithMessage("Unknown source type.");
        RuleFor(x => x.CalculationMode)
            .Must(v => string.IsNullOrWhiteSpace(v) || FinancialCalculationModeExtensions.FromApiString(v).HasValue)
            .WithMessage("Unknown calculation mode.");
        RuleFor(x => x.QuantityUnit)
            .Must(v => string.IsNullOrWhiteSpace(v) || FinancialQuantityUnitExtensions.FromApiString(v).HasValue)
            .WithMessage("Unknown quantity unit.");
        RuleFor(x => x.ProductKind)
            .Must(v => string.IsNullOrWhiteSpace(v) || FinancialProductKindExtensions.FromApiString(v).HasValue)
            .WithMessage("Unknown product kind.");
        RuleFor(x => x.ResultYear)
            .InclusiveBetween(2000, 2100)
            .When(x => x.ResultYear.HasValue);
        RuleFor(x => x)
            .Must(x => x.SaveAsDraft || !string.IsNullOrWhiteSpace(x.Category))
            .WithMessage("Category is required to post a transaction.")
            .Must(x => x.SaveAsDraft || !string.IsNullOrWhiteSpace(x.Description))
            .WithMessage("Description is required to post a transaction.");
    }
}

public class UpdateFinancialTransactionDtoValidator : AbstractValidator<UpdateFinancialTransactionDto>
{
    public UpdateFinancialTransactionDtoValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0).When(x => x.Amount.HasValue);
        RuleFor(x => x.Description).MaximumLength(300).When(x => x.Description != null);
        RuleFor(x => x.Notes).MaximumLength(2000);
        RuleFor(x => x.PaymentMethod).MaximumLength(80);
        RuleFor(x => x.CounterpartyName).MaximumLength(200);
        RuleFor(x => x.Category)
            .Must(v => string.IsNullOrWhiteSpace(v) || FinancialTransactionCategoryExtensions.FromApiString(v).HasValue)
            .WithMessage("Unknown category.");
        RuleFor(x => x.CalculationMode)
            .Must(v => string.IsNullOrWhiteSpace(v) || FinancialCalculationModeExtensions.FromApiString(v).HasValue)
            .WithMessage("Unknown calculation mode.");
        RuleFor(x => x.QuantityUnit)
            .Must(v => string.IsNullOrWhiteSpace(v) || FinancialQuantityUnitExtensions.FromApiString(v).HasValue)
            .WithMessage("Unknown quantity unit.");
        RuleFor(x => x.ProductKind)
            .Must(v => string.IsNullOrWhiteSpace(v) || FinancialProductKindExtensions.FromApiString(v).HasValue)
            .WithMessage("Unknown product kind.");
        RuleFor(x => x.Quantity).GreaterThan(0).When(x => x.Quantity.HasValue);
        RuleFor(x => x.UnitPrice).GreaterThan(0).When(x => x.UnitPrice.HasValue);
        RuleFor(x => x.ResultYear)
            .InclusiveBetween(2000, 2100)
            .When(x => x.ResultYear.HasValue);
    }
}

public class VoidFinancialTransactionDtoValidator : AbstractValidator<VoidFinancialTransactionDto>
{
    public VoidFinancialTransactionDtoValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}
