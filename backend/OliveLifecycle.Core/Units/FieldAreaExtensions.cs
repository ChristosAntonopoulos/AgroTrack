using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Core.Units;

public static class FieldAreaExtensions
{
    public static void NormalizeStoredArea(this Field field)
    {
        var area = field.Area;
        if (FieldArea.TryNormalizeStoredHectares(ref area, field.AppMeasuredAreaSqm, field.GreekCadastre?.OfficialAreaSqm))
        {
            field.Area = area;
        }
    }

    public static double? ResolveAreaSqm(this Field field)
    {
        field.NormalizeStoredArea();
        return FieldArea.ResolveSqm(field.Area, field.AppMeasuredAreaSqm, field.GreekCadastre?.OfficialAreaSqm);
    }

    public static double? ResolveAreaHectares(this Field field)
    {
        var sqm = field.ResolveAreaSqm();
        return sqm is > 0 ? FieldArea.HectaresFromSqm(sqm.Value) : null;
    }

    public static void SetFromSquareMetres(this Field field, double sqm)
    {
        field.AppMeasuredAreaSqm = sqm;
        field.Area = FieldArea.HectaresFromSqm(sqm);
    }

    public static void SetFromHectares(this Field field, double hectares)
    {
        field.Area = hectares;
        if (field.Boundary is null && field.AppMeasuredAreaSqm is null)
        {
            // Manual area with no polygon: keep hectares in Area only.
        }
    }
}
