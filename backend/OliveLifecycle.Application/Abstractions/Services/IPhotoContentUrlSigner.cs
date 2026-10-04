namespace OliveLifecycle.Application.Abstractions.Services;

/// <summary>Creates and validates short-lived HMAC URLs for photo bytes.</summary>
public interface IPhotoContentUrlSigner
{
    string CreateUrl(string photoId, string variant, string userId, TimeSpan? ttl = null);

    bool TryValidate(string photoId, string variant, long expUnix, string signature, string userId);
}

public static class PhotoContentVariants
{
    public const string Original = "original";
    public const string Thumb = "thumb";
}
