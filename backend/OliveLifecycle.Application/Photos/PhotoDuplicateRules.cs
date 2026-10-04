using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Photos;

/// <summary>
/// A re-upload is the same photo when the content hash matches and the capture
/// times agree. Capture time is only compared when both sides have a real EXIF
/// timestamp; an upload-time fallback (captured ≈ created) does not count.
/// </summary>
public static class PhotoDuplicateRules
{
    public static readonly TimeSpan CaptureTolerance = TimeSpan.FromSeconds(2);

    public static bool IsContentHash(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length != 64)
        {
            return false;
        }

        foreach (var ch in value)
        {
            var hex = (ch >= '0' && ch <= '9')
                || (ch >= 'a' && ch <= 'f')
                || (ch >= 'A' && ch <= 'F');
            if (!hex)
            {
                return false;
            }
        }

        return true;
    }

    public static bool HasDistinctCapture(DateTime? capturedAt, DateTime createdAt)
    {
        if (!capturedAt.HasValue)
        {
            return false;
        }

        return (capturedAt.Value - createdAt).Duration() > CaptureTolerance;
    }

    public static bool CaptureAgrees(
        DateTime? incomingExif,
        DateTime? existingCapturedAt,
        DateTime existingCreatedAt)
    {
        var existingExif = HasDistinctCapture(existingCapturedAt, existingCreatedAt)
            ? existingCapturedAt
            : null;
        if (incomingExif.HasValue && existingExif.HasValue)
        {
            return (incomingExif.Value - existingExif.Value).Duration() <= CaptureTolerance;
        }

        return true;
    }

    public static bool IsVisibleToUploader(
        MediaAttachment existing,
        string userId,
        IReadOnlySet<string> accessibleFieldIds)
    {
        if (!string.IsNullOrEmpty(existing.FieldId) && accessibleFieldIds.Contains(existing.FieldId))
        {
            return true;
        }

        return existing.UploadedByUserId == userId && string.IsNullOrEmpty(existing.FieldId);
    }

    public static MediaAttachment? SelectDuplicate(
        IEnumerable<MediaAttachment> hashMatches,
        string userId,
        IReadOnlySet<string> accessibleFieldIds,
        DateTime? incomingExif)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var existing in hashMatches)
        {
            if (string.IsNullOrWhiteSpace(existing.Id) || !seen.Add(existing.Id))
            {
                continue;
            }

            if (!IsVisibleToUploader(existing, userId, accessibleFieldIds))
            {
                continue;
            }

            if (CaptureAgrees(incomingExif, existing.CapturedAt, existing.CreatedAt))
            {
                return existing;
            }
        }

        return null;
    }
}
