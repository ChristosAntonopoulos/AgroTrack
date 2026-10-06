using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public sealed class FieldStatusGuard : IFieldStatusGuard
{
    private readonly IFieldRepository _fields;

    public FieldStatusGuard(IFieldRepository fields)
    {
        _fields = fields;
    }

    public async Task EnsureAcceptsNewRecordsAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fieldId))
        {
            return;
        }

        var field = await _fields.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (field.Status == FieldStatus.Archived)
        {
            throw new ValidationException(
                "This grove is archived. Restore it before adding new records.");
        }
    }
}
