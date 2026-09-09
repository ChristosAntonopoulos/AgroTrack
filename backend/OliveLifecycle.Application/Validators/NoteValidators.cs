using FluentValidation;
using OliveLifecycle.Application.DTOs.Notes;

namespace OliveLifecycle.Application.Validators;

public class UpsertNoteDtoValidator : AbstractValidator<UpsertNoteDto>
{
    public UpsertNoteDtoValidator()
    {
        RuleFor(x => x.Body).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.FieldId).MaximumLength(50).When(x => x.FieldId != null);
    }
}
