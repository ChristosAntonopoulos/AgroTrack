using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Abstractions.Services;

public interface IFieldGeoMatchService
{
    FieldGeoMatchResult Match(double latitude, double longitude, IReadOnlyList<Field> accessibleFields);
}

public sealed class FieldMatchCandidate
{
    public string FieldId { get; init; } = string.Empty;
    public string FieldName { get; init; } = string.Empty;
    public string Reason { get; init; } = string.Empty;
    public double? Score { get; init; }
    public double? DistanceMetres { get; init; }
}

public sealed class FieldGeoMatchResult
{
    public string? FieldId { get; init; }
    public FieldAssignmentStatus Assignment { get; init; } = FieldAssignmentStatus.Unassigned;
    public double? Score { get; init; }
    public IReadOnlyList<FieldMatchCandidate> Candidates { get; init; } = Array.Empty<FieldMatchCandidate>();
}
