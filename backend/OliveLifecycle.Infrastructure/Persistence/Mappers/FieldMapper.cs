using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class FieldMapper
{
    public static Field ToEntity(FieldDocument document) => new()
    {
        Id = document.Id,
        OwnerId = document.OwnerId,
        Name = document.Name,
        Location = document.Location == null
            ? null
            : new Location
            {
                Latitude = document.Location.Latitude,
                Longitude = document.Location.Longitude
            },
        Area = document.Area,
        Variety = document.Variety,
        TreeAge = document.TreeAge,
        GroundType = document.GroundType,
        IrrigationStatus = document.IrrigationStatus,
        CurrentLifecycleYear = document.CurrentLifecycleYear,
        CurrentLifecycleStage = document.CurrentLifecycleStage,
        People = document.Memberships.Select(ToPersonEntity).ToList(),
        AdvisorComments = document.AdvisorComments.Select(ToAdvisorCommentEntity).ToList(),
        Status = document.Status,
        CropType = document.CropType,
        LocationText = document.LocationText,
        Boundary = document.Boundary == null ? null : ToPolygonEntity(document.Boundary),
        CenterPoint = document.CenterPoint == null ? null : ToPointEntity(document.CenterPoint),
        AppMeasuredAreaSqm = document.AppMeasuredAreaSqm,
        TreeCount = document.TreeCount,
        IrrigationType = document.IrrigationType,
        SoilType = document.SoilType,
        Slope = document.Slope,
        AccessNotes = document.AccessNotes,
        Color = document.Color,
        GreekCadastre = document.GreekCadastre == null ? null : ToCadastreEntity(document.GreekCadastre),
        Documents = document.Documents.Select(ToAttachmentEntity).ToList(),
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static FieldDocument ToDocument(Field entity) => new()
    {
        Id = entity.Id,
        OwnerId = entity.OwnerId,
        Name = entity.Name,
        Location = entity.Location == null
            ? null
            : new LocationDocument
            {
                Latitude = entity.Location.Latitude,
                Longitude = entity.Location.Longitude
            },
        Area = entity.Area,
        Variety = entity.Variety,
        TreeAge = entity.TreeAge,
        GroundType = entity.GroundType,
        IrrigationStatus = entity.IrrigationStatus,
        CurrentLifecycleYear = entity.CurrentLifecycleYear,
        CurrentLifecycleStage = entity.CurrentLifecycleStage,
        AssignedProducerIds = [],
        Memberships = entity.People.Select(ToMembershipDocument).ToList(),
        AdvisorComments = entity.AdvisorComments.Select(ToAdvisorCommentDocument).ToList(),
        Status = entity.Status,
        CropType = entity.CropType,
        LocationText = entity.LocationText,
        Boundary = entity.Boundary == null ? null : ToPolygonDocument(entity.Boundary),
        CenterPoint = entity.CenterPoint == null ? null : ToPointDocument(entity.CenterPoint),
        AppMeasuredAreaSqm = entity.AppMeasuredAreaSqm,
        TreeCount = entity.TreeCount,
        IrrigationType = entity.IrrigationType,
        SoilType = entity.SoilType,
        Slope = entity.Slope,
        AccessNotes = entity.AccessNotes,
        Color = entity.Color,
        GreekCadastre = entity.GreekCadastre == null ? null : ToCadastreDocument(entity.GreekCadastre),
        Documents = entity.Documents.Select(ToAttachmentDocument).ToList(),
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    private static GeoJsonPolygon ToPolygonEntity(GeoJsonPolygonDocument doc) => new()
    {
        Type = doc.Type,
        Coordinates = doc.Coordinates
    };

    private static GeoJsonPoint ToPointEntity(GeoJsonPointDocument doc) => new()
    {
        Type = doc.Type,
        Coordinates = doc.Coordinates
    };

    private static GreekCadastreInfo ToCadastreEntity(GreekCadastreInfoDocument doc) => new()
    {
        Kaek = doc.Kaek,
        NormalizedKaek = doc.NormalizedKaek,
        OfficialAreaSqm = doc.OfficialAreaSqm,
        TitleAreaSqm = doc.TitleAreaSqm,
        TitleAreaRaw = doc.TitleAreaRaw,
        LocationFromCadastre = doc.LocationFromCadastre,
        CadastralOffice = doc.CadastralOffice,
        Prefecture = doc.Prefecture,
        Municipality = doc.Municipality,
        PostalCode = doc.PostalCode,
        CoordinateSystem = doc.CoordinateSystem,
        MapScale = doc.MapScale,
        ExtractPrintDate = doc.ExtractPrintDate,
        Source = doc.Source,
        VerificationStatus = doc.VerificationStatus,
        AreaDifferenceSqm = doc.AreaDifferenceSqm,
        AreaDifferencePercent = doc.AreaDifferencePercent
    };

    private static FieldDocumentAttachment ToAttachmentEntity(FieldDocumentAttachmentDocument doc) => new()
    {
        Id = doc.Id,
        Type = doc.Type,
        FileName = doc.FileName,
        StoragePath = doc.StoragePath,
        UploadedAt = doc.UploadedAt
    };

    private static GeoJsonPolygonDocument ToPolygonDocument(GeoJsonPolygon entity) => new()
    {
        Type = entity.Type,
        Coordinates = entity.Coordinates
    };

    private static GeoJsonPointDocument ToPointDocument(GeoJsonPoint entity) => new()
    {
        Type = entity.Type,
        Coordinates = entity.Coordinates
    };

    private static GreekCadastreInfoDocument ToCadastreDocument(GreekCadastreInfo entity) => new()
    {
        Kaek = entity.Kaek,
        NormalizedKaek = entity.NormalizedKaek,
        OfficialAreaSqm = entity.OfficialAreaSqm,
        TitleAreaSqm = entity.TitleAreaSqm,
        TitleAreaRaw = entity.TitleAreaRaw,
        LocationFromCadastre = entity.LocationFromCadastre,
        CadastralOffice = entity.CadastralOffice,
        Prefecture = entity.Prefecture,
        Municipality = entity.Municipality,
        PostalCode = entity.PostalCode,
        CoordinateSystem = entity.CoordinateSystem,
        MapScale = entity.MapScale,
        ExtractPrintDate = entity.ExtractPrintDate,
        Source = entity.Source,
        VerificationStatus = entity.VerificationStatus,
        AreaDifferenceSqm = entity.AreaDifferenceSqm,
        AreaDifferencePercent = entity.AreaDifferencePercent
    };

    private static FieldDocumentAttachmentDocument ToAttachmentDocument(FieldDocumentAttachment entity) => new()
    {
        Id = entity.Id,
        Type = entity.Type,
        FileName = entity.FileName,
        StoragePath = entity.StoragePath,
        UploadedAt = entity.UploadedAt
    };

    private static FieldPerson ToPersonEntity(FieldMembershipDocument doc)
    {
        var person = new FieldPerson
        {
            UserId = doc.UserId,
            Modules = doc.Modules?.ToList() ?? new List<string>(),
            AccessLevel = doc.AccessLevel ?? string.Empty,
            Status = doc.Status,
            InviteId = doc.InviteId,
            InvitedBy = doc.InvitedBy,
            DisplayName = doc.DisplayName ?? string.Empty,
            Email = doc.Email,
            CreatedAt = doc.CreatedAt,
            Role = InferRole(doc.Role, doc.Capacities)
        };

        return person;
    }

    private static FieldMembershipDocument ToMembershipDocument(FieldPerson entity) => new()
    {
        UserId = entity.UserId,
        Role = entity.Role.ToString(),
        Modules = entity.Modules?.ToList() ?? new List<string>(),
        AccessLevel = entity.AccessLevel,
        Status = entity.Status,
        InviteId = entity.InviteId,
        InvitedBy = entity.InvitedBy,
        DisplayName = entity.DisplayName,
        Email = entity.Email,
        CreatedAt = entity.CreatedAt
    };

    /// <summary>
    /// Prefer stored Role; otherwise infer from legacy Capacities BSON (own→Admin, work/advise→Partner, help→Family).
    /// </summary>
    internal static FieldPersonRole InferRole(string? role, IEnumerable<string>? capacities)
    {
        if (!string.IsNullOrWhiteSpace(role)
            && Enum.TryParse<FieldPersonRole>(role, ignoreCase: true, out var parsed)
            && parsed != default)
        {
            return parsed;
        }

        var caps = capacities?.ToList() ?? [];
        if (caps.Any(c => string.Equals(c, "own", StringComparison.OrdinalIgnoreCase)))
        {
            return FieldPersonRole.Admin;
        }

        if (caps.Any(c => string.Equals(c, "work", StringComparison.OrdinalIgnoreCase)
                          || string.Equals(c, "advise", StringComparison.OrdinalIgnoreCase)))
        {
            return FieldPersonRole.Partner;
        }

        return FieldPersonRole.Family;
    }

    private static AdvisorComment ToAdvisorCommentEntity(AdvisorCommentDocument doc) => new()
    {
        Id = doc.Id,
        UserId = doc.UserId,
        Body = doc.Body,
        CreatedAt = doc.CreatedAt
    };

    private static AdvisorCommentDocument ToAdvisorCommentDocument(AdvisorComment entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        Body = entity.Body,
        CreatedAt = entity.CreatedAt
    };
}
