using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.ValueObjects;

namespace OliveLifecycle.Application.Services;

public interface IBoundaryVertexPhotoService
{
    Task<IReadOnlyList<BoundaryVertexPhotoDto>> ListAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task<BoundaryVertexPhotoDto> AssignAsync(
        string fieldId,
        int vertexIndex,
        string photoId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task ClearAsync(
        string fieldId,
        int vertexIndex,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default);

    Task RemapAfterBoundaryUpdateAsync(
        string fieldId,
        GeoJsonPolygon? newBoundary,
        CancellationToken cancellationToken = default);
}

public class BoundaryVertexPhotoService : IBoundaryVertexPhotoService
{
    private const double RemapMaxMetres = 25d;

    private readonly IFieldRepository _fields;
    private readonly IMediaAttachmentRepository _media;
    private readonly IFieldAccessService _access;
    private readonly IPhotoContentUrlSigner _urlSigner;

    public BoundaryVertexPhotoService(
        IFieldRepository fields,
        IMediaAttachmentRepository media,
        IFieldAccessService access,
        IPhotoContentUrlSigner urlSigner)
    {
        _fields = fields;
        _media = media;
        _access = access;
        _urlSigner = urlSigner;
    }

    public async Task<IReadOnlyList<BoundaryVertexPhotoDto>> ListAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        await EnsureAccessAsync(fieldId, userId, userRole, cancellationToken);
        var photos = await LoadVertexPhotosAsync(fieldId, cancellationToken);
        return photos
            .Where(p => p.BoundaryVertexIndex is >= 0)
            .OrderBy(p => p.BoundaryVertexIndex)
            .Select(p => ToDto(p, userId))
            .ToList();
    }

    public async Task<BoundaryVertexPhotoDto> AssignAsync(
        string fieldId,
        int vertexIndex,
        string photoId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (!await _access.CanUserModifyFieldAsync(fieldId, userId, cancellationToken)
            && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to update this field.");
        }

        var field = await _fields.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        var ring = GetOpenRing(field.Boundary)
            ?? throw new ValidationException("Draw a boundary before attaching vertex photos.");
        if (vertexIndex < 0 || vertexIndex >= ring.Count)
        {
            throw new ValidationException("Vertex index is out of range for this boundary.");
        }

        var photo = await _media.GetByIdAsync(photoId, cancellationToken)
            ?? throw new NotFoundException("Photo not found.");
        if (photo.IsTrashed)
        {
            throw new ValidationException("Cannot attach a deleted photo.");
        }

        // Clear any prior photo on this vertex.
        foreach (var existing in await LoadVertexPhotosAsync(fieldId, cancellationToken))
        {
            if (existing.BoundaryVertexIndex == vertexIndex && existing.Id != photo.Id)
            {
                existing.BoundaryVertexIndex = null;
                if (existing.Kind == PhotoKind.BoundaryVertex)
                {
                    existing.Kind = PhotoKind.General;
                }
                existing.UpdatedAt = DateTime.UtcNow;
                await _media.UpdateAsync(existing, cancellationToken);
            }
        }

        var (lng, lat) = ring[vertexIndex];
        photo.FieldId = fieldId;
        photo.OwnerType = MediaOwnerType.Field;
        photo.OwnerId = string.Empty;
        photo.Kind = PhotoKind.BoundaryVertex;
        photo.BoundaryVertexIndex = vertexIndex;
        photo.Latitude = lat;
        photo.Longitude = lng;
        photo.FieldAssignment = FieldAssignmentStatus.Manual;
        photo.AssignmentReason = "boundaryVertex";
        photo.UpdatedAt = DateTime.UtcNow;
        var saved = await _media.UpdateAsync(photo, cancellationToken);
        return ToDto(saved, userId);
    }

    public async Task ClearAsync(
        string fieldId,
        int vertexIndex,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (!await _access.CanUserModifyFieldAsync(fieldId, userId, cancellationToken)
            && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to update this field.");
        }

        foreach (var photo in await LoadVertexPhotosAsync(fieldId, cancellationToken))
        {
            if (photo.BoundaryVertexIndex != vertexIndex) continue;
            photo.BoundaryVertexIndex = null;
            photo.Kind = PhotoKind.General;
            photo.UpdatedAt = DateTime.UtcNow;
            await _media.UpdateAsync(photo, cancellationToken);
        }
    }

    public async Task RemapAfterBoundaryUpdateAsync(
        string fieldId,
        GeoJsonPolygon? newBoundary,
        CancellationToken cancellationToken = default)
    {
        var photos = await LoadVertexPhotosAsync(fieldId, cancellationToken);
        if (photos.Count == 0) return;

        var boundary = newBoundary;
        if (boundary == null)
        {
            var field = await _fields.GetByIdAsync(fieldId, cancellationToken);
            boundary = field?.Boundary;
        }

        var ring = GetOpenRing(boundary);
        foreach (var photo in photos)
        {
            if (photo.Latitude is not double lat || photo.Longitude is not double lng || ring == null)
            {
                photo.BoundaryVertexIndex = null;
                photo.Kind = PhotoKind.General;
                photo.UpdatedAt = DateTime.UtcNow;
                await _media.UpdateAsync(photo, cancellationToken);
                continue;
            }

            var bestIdx = -1;
            var bestMetres = double.MaxValue;
            for (var i = 0; i < ring.Count; i++)
            {
                var (vlng, vlat) = ring[i];
                var metres = HaversineMetres(lat, lng, vlat, vlng);
                if (metres < bestMetres)
                {
                    bestMetres = metres;
                    bestIdx = i;
                }
            }

            if (bestIdx >= 0 && bestMetres <= RemapMaxMetres)
            {
                var (vlng, vlat) = ring[bestIdx];
                photo.BoundaryVertexIndex = bestIdx;
                photo.Latitude = vlat;
                photo.Longitude = vlng;
                photo.Kind = PhotoKind.BoundaryVertex;
            }
            else
            {
                photo.BoundaryVertexIndex = null;
                photo.Kind = PhotoKind.General;
            }

            photo.UpdatedAt = DateTime.UtcNow;
            await _media.UpdateAsync(photo, cancellationToken);
        }
    }

    private async Task EnsureAccessAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        if (!await _access.CanUserAccessFieldModuleAsync(
                fieldId, userId, userRole, FamilyModules.Fields, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }
    }

    private async Task<List<MediaAttachment>> LoadVertexPhotosAsync(
        string fieldId,
        CancellationToken cancellationToken)
    {
        var (items, _) = await _media.QueryAsync(new MediaAttachmentQuery
        {
            FieldId = fieldId,
            Page = 1,
            PageSize = 200
        }, cancellationToken);

        return items
            .Where(p =>
                !p.IsTrashed &&
                (p.Kind == PhotoKind.BoundaryVertex || p.BoundaryVertexIndex != null))
            .ToList();
    }

    private BoundaryVertexPhotoDto ToDto(MediaAttachment photo, string userId) => new()
    {
        PhotoId = photo.Id,
        VertexIndex = photo.BoundaryVertexIndex ?? 0,
        Url = _urlSigner.CreateUrl(photo.Id, PhotoContentVariants.Original, userId),
        ThumbnailUrl = _urlSigner.CreateUrl(photo.Id, PhotoContentVariants.Thumb, userId),
        Latitude = photo.Latitude,
        Longitude = photo.Longitude
    };

    private static List<(double Lng, double Lat)>? GetOpenRing(GeoJsonPolygon? polygon)
    {
        var ring = polygon?.Coordinates?.FirstOrDefault();
        if (ring == null || ring.Count < 4) return null;
        var open = new List<(double Lng, double Lat)>();
        var limit = ring.Count - 1;
        for (var i = 0; i < limit; i++)
        {
            var point = ring[i];
            if (point.Count < 2) continue;
            open.Add((point[0], point[1]));
        }
        return open.Count >= 3 ? open : null;
    }

    private static double HaversineMetres(double lat1, double lon1, double lat2, double lon2)
    {
        const double r = 6_371_000d;
        static double Rad(double deg) => deg * Math.PI / 180d;
        var dLat = Rad(lat2 - lat1);
        var dLon = Rad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(Rad(lat1)) * Math.Cos(Rad(lat2))
              * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return 2 * r * Math.Asin(Math.Min(1, Math.Sqrt(a)));
    }
}
