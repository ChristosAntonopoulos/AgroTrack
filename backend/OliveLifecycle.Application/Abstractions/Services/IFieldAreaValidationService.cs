using OliveLifecycle.Application.DTOs.Field;

namespace OliveLifecycle.Application.Abstractions.Services;

public interface IFieldAreaValidationService
{
    FieldAreaValidationResponse Validate(double appMeasuredAreaSqm, double? officialAreaSqm, int? treeCount = null);
}
