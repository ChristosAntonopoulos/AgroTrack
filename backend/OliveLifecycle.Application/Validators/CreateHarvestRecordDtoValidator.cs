using FluentValidation;
using OliveLifecycle.Application.DTOs.Harvest;

namespace OliveLifecycle.Application.Validators;

public class CreateHarvestRecordDtoValidator : AbstractValidator<CreateHarvestRecordDto>
{
    public CreateHarvestRecordDtoValidator()
    {
        RuleFor(x => x.FieldId).NotEmpty();
        RuleFor(x => x.OliveKg).GreaterThan(0);
        RuleFor(x => x.WorkersUsed).GreaterThanOrEqualTo(0);
        RuleFor(x => x.OilKg).GreaterThan(0).When(x => x.OilKg.HasValue);
        RuleFor(x => x.SaleAmount).GreaterThan(0).When(x => x.SaleAmount.HasValue);
        RuleFor(x => x.MillCost).GreaterThan(0).When(x => x.MillCost.HasValue);
        RuleFor(x => x.HarvestMethod).MaximumLength(120);
        RuleFor(x => x.MillName).MaximumLength(200);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}
