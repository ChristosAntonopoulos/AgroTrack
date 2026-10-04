using OliveLifecycle.Core.OilStock;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Family asks Admin for a pack from the Admin cellar; accept moves it into the requester's cellar.
/// </summary>
public class OilShareRequest : BaseEntity
{
    /// <summary>Cellar the oil leaves. A request has two sides, so both cellars are recorded.</summary>
    public string FromCellarId { get; set; } = string.Empty;

    /// <summary>Cellar the oil arrives in.</summary>
    public string ToCellarId { get; set; } = string.Empty;

    /// <summary>Read-only mirror of <see cref="FromCellarId"/>'s owner, kept for one release.</summary>
    public string FromOwnerUserId { get; set; } = string.Empty;

    /// <summary>Read-only mirror of <see cref="ToCellarId"/>'s owner, kept for one release.</summary>
    public string ToUserId { get; set; } = string.Empty;
    public string FromDisplayName { get; set; } = string.Empty;
    public string ToDisplayName { get; set; } = string.Empty;

    public OilPack Requested { get; set; } = OilPack.Empty();
    public List<string> FieldIds { get; set; } = [];
    public string? Notes { get; set; }

    /// <summary>pending | accepted | rejected | cancelled</summary>
    public string Status { get; set; } = OilShareRequestStatuses.Pending;

    public string? ResultLotId { get; set; }
}

public static class OilShareRequestStatuses
{
    public const string Pending = "pending";
    public const string Accepted = "accepted";
    public const string Rejected = "rejected";
    public const string Cancelled = "cancelled";
}
