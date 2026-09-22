using OliveLifecycle.Application.Photos;
using OliveLifecycle.Core.Entities;
using Xunit;

namespace OliveLifecycle.Application.Tests.Photos;

public class PhotoDuplicateRulesTests
{
    private static readonly DateTime Created = new(2024, 6, 1, 8, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void SameHashAndCaptureTime_IsDuplicate()
    {
        var incoming = Created.AddHours(2);
        var existing = Photo(incoming, Created);
        var match = PhotoDuplicateRules.SelectDuplicate(
            new[] { existing }, "user-1", Fields("field-a"), incoming);

        Assert.Same(existing, match);
    }

    [Fact]
    public void SameHashDifferentCaptureTime_IsNotDuplicate()
    {
        var existing = Photo(Created.AddHours(2), Created);
        var match = PhotoDuplicateRules.SelectDuplicate(
            new[] { existing }, "user-1", Fields("field-a"), Created.AddHours(5));

        Assert.Null(match);
    }

    [Fact]
    public void HashMatchWithoutExif_StillCounts()
    {
        var existing = Photo(capturedAt: Created, createdAt: Created);
        var match = PhotoDuplicateRules.SelectDuplicate(
            new[] { existing }, "user-1", Fields("field-a"), incomingExif: null);

        Assert.Same(existing, match);
    }

    [Fact]
    public void IgnoresPhotosOnInaccessibleFields()
    {
        var captured = Created.AddHours(1);
        var existing = Photo(captured, Created, fieldId: "other-field", userId: "someone-else");
        var match = PhotoDuplicateRules.SelectDuplicate(
            new[] { existing }, "user-1", Fields("field-a"), captured);

        Assert.Null(match);
    }

    [Fact]
    public void CaptureTimesWithinTwoSeconds_Agree()
    {
        var left = Created.AddMinutes(10);
        var right = left.AddSeconds(2);
        Assert.True(PhotoDuplicateRules.CaptureAgrees(left, right, Created));
        Assert.False(PhotoDuplicateRules.CaptureAgrees(left, left.AddSeconds(3), Created));
    }

    private static HashSet<string> Fields(params string[] ids) =>
        new(ids, StringComparer.Ordinal);

    private static MediaAttachment Photo(
        DateTime? capturedAt,
        DateTime createdAt,
        string fieldId = "field-a",
        string userId = "user-1") => new()
    {
        Id = "photo-1",
        FieldId = fieldId,
        UploadedByUserId = userId,
        ContentHash = new string('a', 64),
        CapturedAt = capturedAt,
        CreatedAt = createdAt
    };
}
