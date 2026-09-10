using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Units;
using OliveLifecycle.Core.ValueObjects;

namespace OliveLifecycle.Application.Mappings;

public static class FieldMapper
{
    public static FieldDto ToDto(Field field, bool includeDocuments = true)
    {
        field.NormalizeStoredArea();
        var areaSqm = field.ResolveAreaSqm();
        var areaHectares = areaSqm is > 0 ? FieldArea.HectaresFromSqm(areaSqm.Value) : (double?)null;
        return new()
    {
        Id = field.Id,
        OwnerId = field.OwnerId,
        Name = field.Name,
        Latitude = field.CenterPoint?.Coordinates.Count >= 2
            ? field.CenterPoint.Coordinates[1]
            : field.Location?.Latitude,
        Longitude = field.CenterPoint?.Coordinates.Count >= 2
            ? field.CenterPoint.Coordinates[0]
            : field.Location?.Longitude,
        Area = areaHectares ?? 0,
        AreaSqm = areaSqm,
        AreaHectares = areaHectares,
        Variety = field.Variety,
        TreeAge = field.TreeAge,
        GroundType = field.SoilType ?? field.GroundType,
        IrrigationStatus = field.IrrigationStatus,
        CurrentLifecycleYear = field.CurrentLifecycleYear,
        CurrentLifecycleStage = OliveLifecycleStage.Normalize(field.CurrentLifecycleStage),
        AssignedProducerIds = field.AssignedProducerIds,
        Memberships = field.Memberships.Select(ToMembershipDto).ToList(),
        AdvisorComments = field.AdvisorComments.Select(ToAdvisorCommentDto).ToList(),
        CreatedAt = field.CreatedAt,
        UpdatedAt = field.UpdatedAt,
        Status = field.Status.ToString(),
        CropType = field.CropType,
        LocationText = field.LocationText,
        Boundary = field.Boundary == null ? null : ToPolygonDto(field.Boundary),
        CenterPoint = field.CenterPoint == null ? null : ToPointDto(field.CenterPoint),
        AppMeasuredAreaSqm = field.AppMeasuredAreaSqm,
        TreeCount = field.TreeCount,
        OliveVariety = field.Variety,
        IrrigationType = field.IrrigationType ?? (field.IrrigationStatus ? "Drip irrigation" : "Rainfed"),
        SoilType = field.SoilType ?? field.GroundType,
        Slope = field.Slope,
        AccessNotes = field.AccessNotes,
        GreekCadastre = field.GreekCadastre == null ? null : ToCadastreDto(field.GreekCadastre),
        Color = field.Color,
        Documents = includeDocuments
            ? field.Documents.Select(ToDocumentDto).ToList()
            : new List<FieldDocumentAttachmentDto>()
    };
    }

    public static FieldMembershipDto ToMembershipDto(FieldMembership membership) => new()
    {
        UserId = membership.UserId,
        Capacities = membership.Capacities,
        Status = membership.Status,
        InvitedBy = membership.InvitedBy,
        CreatedAt = membership.CreatedAt
    };

    public static AdvisorCommentDto ToAdvisorCommentDto(AdvisorComment comment) => new()
    {
        Id = comment.Id,
        UserId = comment.UserId,
        Body = comment.Body,
        CreatedAt = comment.CreatedAt
    };

    public static GeoJsonPolygonDto ToPolygonDto(GeoJsonPolygon polygon) => new()
    {
        Type = polygon.Type,
        Coordinates = polygon.Coordinates
    };

    public static GeoJsonPointDto ToPointDto(GeoJsonPoint point) => new()
    {
        Type = point.Type,
        Coordinates = point.Coordinates
    };

    public static GeoJsonPolygon ToPolygonEntity(GeoJsonPolygonDto dto) => new()
    {
        Type = string.IsNullOrWhiteSpace(dto.Type) ? "Polygon" : dto.Type,
        Coordinates = dto.Coordinates
    };

    public static GeoJsonPoint ToPointEntity(GeoJsonPointDto dto) => new()
    {
        Type = string.IsNullOrWhiteSpace(dto.Type) ? "Point" : dto.Type,
        Coordinates = dto.Coordinates
    };

    public static GreekCadastreInfoDto ToCadastreDto(GreekCadastreInfo info) => new()
    {
        Kaek = info.Kaek,
        NormalizedKaek = info.NormalizedKaek,
        OfficialAreaSqm = info.OfficialAreaSqm,
        TitleAreaSqm = info.TitleAreaSqm,
        TitleAreaRaw = info.TitleAreaRaw,
        LocationFromCadastre = info.LocationFromCadastre,
        CadastralOffice = info.CadastralOffice,
        Prefecture = info.Prefecture,
        Municipality = info.Municipality,
        PostalCode = info.PostalCode,
        CoordinateSystem = info.CoordinateSystem,
        MapScale = info.MapScale,
        ExtractPrintDate = info.ExtractPrintDate,
        Source = info.Source,
        VerificationStatus = info.VerificationStatus,
        AreaDifferenceSqm = info.AreaDifferenceSqm,
        AreaDifferencePercent = info.AreaDifferencePercent
    };

    public static GreekCadastreInfo ToCadastreEntity(GreekCadastreInfoDto dto) => new()
    {
        Kaek = dto.Kaek,
        NormalizedKaek = dto.NormalizedKaek,
        OfficialAreaSqm = dto.OfficialAreaSqm,
        TitleAreaSqm = dto.TitleAreaSqm,
        TitleAreaRaw = dto.TitleAreaRaw,
        LocationFromCadastre = dto.LocationFromCadastre,
        CadastralOffice = dto.CadastralOffice,
        Prefecture = dto.Prefecture,
        Municipality = dto.Municipality,
        PostalCode = dto.PostalCode,
        CoordinateSystem = dto.CoordinateSystem,
        MapScale = dto.MapScale,
        ExtractPrintDate = dto.ExtractPrintDate,
        Source = dto.Source,
        VerificationStatus = dto.VerificationStatus,
        AreaDifferenceSqm = dto.AreaDifferenceSqm,
        AreaDifferencePercent = dto.AreaDifferencePercent
    };

    public static FieldDocumentAttachmentDto ToDocumentDto(FieldDocumentAttachment doc) => new()
    {
        Id = doc.Id,
        Type = doc.Type,
        FileName = doc.FileName,
        StoragePath = doc.StoragePath,
        UploadedAt = doc.UploadedAt
    };

    public static FieldStatus ParseStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return FieldStatus.Draft;
        }

        return Enum.TryParse<FieldStatus>(status, true, out var parsed)
            ? parsed
            : FieldStatus.Draft;
    }
}
