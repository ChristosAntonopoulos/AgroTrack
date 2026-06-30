using OliveLifecycle.Core.ValueObjects;

namespace OliveLifecycle.Application.Abstractions.Services;

public class FieldAreaResult
{
    public double AreaSqm { get; set; }
    public GeoJsonPoint CenterPoint { get; set; } = new();
}

public interface IFieldAreaCalculator
{
    FieldAreaResult Calculate(GeoJsonPolygon boundary);
    void ValidatePolygon(GeoJsonPolygon boundary);
}
