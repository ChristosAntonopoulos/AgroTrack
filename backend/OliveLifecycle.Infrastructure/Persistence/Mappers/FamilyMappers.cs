using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class FamilyMappers
{
    public static FamilyCircle ToEntity(FamilyCircleDocument document) => new()
    {
        Id = document.Id,
        OwnerUserId = document.OwnerUserId,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static FamilyCircleDocument ToDocument(FamilyCircle entity) => new()
    {
        Id = entity.Id,
        OwnerUserId = entity.OwnerUserId,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static FamilyMember ToEntity(FamilyMemberDocument document) => new()
    {
        Id = document.Id,
        CircleId = document.CircleId,
        OwnerUserId = document.OwnerUserId,
        DisplayName = document.DisplayName,
        Phone = document.Phone,
        Email = document.Email,
        LinkedUserId = document.LinkedUserId,
        Modules = document.Modules ?? new List<string>(),
        AccessLevel = document.AccessLevel,
        Status = document.Status,
        InviteId = document.InviteId,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static FamilyMemberDocument ToDocument(FamilyMember entity) => new()
    {
        Id = entity.Id,
        CircleId = entity.CircleId,
        OwnerUserId = entity.OwnerUserId,
        DisplayName = entity.DisplayName,
        Phone = entity.Phone,
        Email = entity.Email,
        LinkedUserId = entity.LinkedUserId,
        Modules = entity.Modules,
        AccessLevel = entity.AccessLevel,
        Status = entity.Status,
        InviteId = entity.InviteId,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static FamilyInvite ToEntity(FamilyInviteDocument document) => new()
    {
        Id = document.Id,
        Token = document.Token,
        Code = document.Code,
        CircleId = document.CircleId,
        MemberId = document.MemberId,
        OwnerUserId = document.OwnerUserId,
        InvitedBy = document.InvitedBy,
        DisplayName = document.DisplayName,
        Phone = document.Phone,
        Email = document.Email,
        Modules = document.Modules ?? new List<string>(),
        AccessLevel = document.AccessLevel,
        Status = document.Status,
        ExpiresAt = document.ExpiresAt,
        AcceptedBy = document.AcceptedBy,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static FamilyInviteDocument ToDocument(FamilyInvite entity) => new()
    {
        Id = entity.Id,
        Token = entity.Token,
        Code = entity.Code,
        CircleId = entity.CircleId,
        MemberId = entity.MemberId,
        OwnerUserId = entity.OwnerUserId,
        InvitedBy = entity.InvitedBy,
        DisplayName = entity.DisplayName,
        Phone = entity.Phone,
        Email = entity.Email,
        Modules = entity.Modules,
        AccessLevel = entity.AccessLevel,
        Status = entity.Status,
        ExpiresAt = entity.ExpiresAt,
        AcceptedBy = entity.AcceptedBy,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
