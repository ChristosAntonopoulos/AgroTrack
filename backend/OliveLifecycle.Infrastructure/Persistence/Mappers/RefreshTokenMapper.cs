using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class RefreshTokenMapper
{
    public static RefreshToken ToEntity(RefreshTokenDocument document) => new()
    {
        Id = document.Id,
        UserId = document.UserId,
        TokenHash = document.TokenHash,
        ExpiresAt = document.ExpiresAt,
        RevokedAt = document.RevokedAt,
        ReplacedByTokenHash = document.ReplacedByTokenHash,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static RefreshTokenDocument ToDocument(RefreshToken entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        TokenHash = entity.TokenHash,
        ExpiresAt = entity.ExpiresAt,
        RevokedAt = entity.RevokedAt,
        ReplacedByTokenHash = entity.ReplacedByTokenHash,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
