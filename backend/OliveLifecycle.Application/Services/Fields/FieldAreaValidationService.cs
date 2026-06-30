using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;

namespace OliveLifecycle.Application.Services.Fields;

public class FieldAreaValidationService : IFieldAreaValidationService
{
    private const double TreeDensityWarningSqmPerTree = 10.0;

    public FieldAreaValidationResponse Validate(double appMeasuredAreaSqm, double? officialAreaSqm, int? treeCount = null)
    {
        var response = new FieldAreaValidationResponse
        {
            AppMeasuredAreaSqm = appMeasuredAreaSqm,
            OfficialAreaSqm = officialAreaSqm,
            Severity = "Ok",
            Message = "Area comparison is within acceptable range."
        };

        if (!officialAreaSqm.HasValue || officialAreaSqm.Value <= 0)
        {
            response.Message = "No official cadastre area available for comparison.";
            AppendTreeDensityWarning(response, appMeasuredAreaSqm, treeCount);
            return response;
        }

        var official = officialAreaSqm.Value;
        var difference = Math.Abs(appMeasuredAreaSqm - official);
        var percent = official > 0 ? difference / official * 100.0 : 0;

        response.DifferenceSqm = difference;
        response.DifferencePercent = Math.Round(percent, 2);

        if (percent <= 5)
        {
            response.Severity = "Ok";
            response.Message = "Measured area is close to the official cadastre parcel area.";
        }
        else if (percent <= 20)
        {
            response.Severity = "Warning";
            response.Message =
                $"The field you drew is {appMeasuredAreaSqm:F0} m² but the cadastre parcel area is {official:F0} m². Please confirm this is your real working field.";
        }
        else
        {
            response.Severity = "Critical";
            response.Message =
                $"The drawn field is much larger than the official parcel area ({appMeasuredAreaSqm:F0} m² vs {official:F0} m²). Please confirm if this is the real working field or if the wrong parcel was imported.";
        }

        AppendTreeDensityWarning(response, appMeasuredAreaSqm, treeCount);
        return response;
    }

    private static void AppendTreeDensityWarning(FieldAreaValidationResponse response, double areaSqm, int? treeCount)
    {
        if (!treeCount.HasValue || treeCount.Value <= 0 || areaSqm <= 0)
        {
            return;
        }

        var sqmPerTree = areaSqm / treeCount.Value;
        if (sqmPerTree < TreeDensityWarningSqmPerTree)
        {
            response.Warnings.Add(
                $"{areaSqm:F0} m² with {treeCount.Value} olive trees is probably wrong. Please check the area or tree count.");
        }
    }
}
