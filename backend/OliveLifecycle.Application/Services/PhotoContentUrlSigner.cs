using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using OliveLifecycle.Application.Abstractions.Services;

namespace OliveLifecycle.Application.Services;

public sealed class PhotoContentUrlSigner : IPhotoContentUrlSigner
{
    public static readonly TimeSpan DefaultTtl = TimeSpan.FromHours(1);

    private readonly byte[] _key;

    public PhotoContentUrlSigner(IConfiguration configuration)
    {
        var secret = configuration["Storage:SigningKey"]
            ?? configuration["JWT:SecretKey"]
            ?? "oleachron-dev-photo-signing-key-change-me";
        _key = Encoding.UTF8.GetBytes(secret);
    }

    public string CreateUrl(string photoId, string variant, string userId, TimeSpan? ttl = null)
    {
        var exp = DateTimeOffset.UtcNow.Add(ttl ?? DefaultTtl).ToUnixTimeSeconds();
        var uid = userId ?? string.Empty;
        var sig = Sign(photoId, variant, exp, uid);
        return $"/api/v1/photos/{Uri.EscapeDataString(photoId)}/content?variant={Uri.EscapeDataString(variant)}&exp={exp}&uid={Uri.EscapeDataString(uid)}&sig={Uri.EscapeDataString(sig)}";
    }

    public bool TryValidate(string photoId, string variant, long expUnix, string signature, string userId)
    {
        if (string.IsNullOrWhiteSpace(photoId)
            || string.IsNullOrWhiteSpace(variant)
            || string.IsNullOrWhiteSpace(signature)
            || string.IsNullOrWhiteSpace(userId))
        {
            return false;
        }

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (expUnix < now || expUnix > now + (long)TimeSpan.FromDays(2).TotalSeconds)
        {
            return false;
        }

        var expected = Sign(photoId, variant, expUnix, userId);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var actualBytes = Encoding.UTF8.GetBytes(signature);
        if (expectedBytes.Length != actualBytes.Length)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }

    private string Sign(string photoId, string variant, long expUnix, string userId)
    {
        var payload = $"{photoId}|{variant}|{expUnix.ToString(CultureInfo.InvariantCulture)}|{userId}";
        using var hmac = new HMACSHA256(_key);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
