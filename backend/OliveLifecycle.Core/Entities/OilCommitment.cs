using OliveLifecycle.Core.OilStock;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Someone will receive oil (promise and/or sale). Status is derived from acts, not chosen.
/// </summary>
public class OilCommitment : BaseEntity
{
    /// <summary>Cellar the promised oil leaves from.</summary>
    public string CellarId { get; set; } = string.Empty;

    /// <summary>Read-only mirror of the cellar owner, kept for one release while clients migrate.</summary>
    public string OwnerUserId { get; set; } = string.Empty;
    public string? ContactId { get; set; }
    public string CounterpartyName { get; set; } = string.Empty;

    public OilPack Requested { get; set; } = OilPack.Empty();
    public OilPack Delivered { get; set; } = OilPack.Empty();

    public bool IsSale { get; set; }
    public decimal? Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public string? FinancialTransactionId { get; set; }

    /// <summary>
    /// <see cref="OilPaymentStatuses"/>. Only meaningful for sales; non-sale promises stay <c>paid</c>.
    /// </summary>
    public string PaymentStatus { get; set; } = OilPaymentStatuses.Paid;

    /// <summary>Client-supplied replay key so a retried create returns the original commitment.</summary>
    public string? IdempotencyKey { get; set; }

    public List<OilLotAllocation> Allocations { get; set; } = [];

    public DateTime? PromisedFor { get; set; }
    public string? Notes { get; set; }
    public bool Cancelled { get; set; }
}

/// <summary>How a sale commitment stands on money: unpaid | receivable | paid | cancelled.</summary>
public static class OilPaymentStatuses
{
    /// <summary>Sale with an amount but no income posted (e.g. Money posting failed).</summary>
    public const string Unpaid = "unpaid";

    /// <summary>Sold on credit: the buyer owes the money, no income posted yet.</summary>
    public const string Receivable = "receivable";

    /// <summary>Income is posted (or nothing is owed).</summary>
    public const string Paid = "paid";

    public const string Cancelled = "cancelled";
}
