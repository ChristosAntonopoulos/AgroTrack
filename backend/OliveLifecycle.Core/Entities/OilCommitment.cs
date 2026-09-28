using OliveLifecycle.Core.OilStock;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Someone will receive oil (promise and/or sale). Status is derived from acts, not chosen.
/// </summary>
public class OilCommitment : BaseEntity
{
    public string OwnerUserId { get; set; } = string.Empty;
    public string? ContactId { get; set; }
    public string CounterpartyName { get; set; } = string.Empty;

    public OilPack Requested { get; set; } = OilPack.Empty();
    public OilPack Delivered { get; set; } = OilPack.Empty();

    public bool IsSale { get; set; }
    public decimal? Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public string? FinancialTransactionId { get; set; }

    public List<OilLotAllocation> Allocations { get; set; } = [];

    public DateTime? PromisedFor { get; set; }
    public string? Notes { get; set; }
    public bool Cancelled { get; set; }
}
