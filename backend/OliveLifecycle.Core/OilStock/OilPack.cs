namespace OliveLifecycle.Core.OilStock;

/// <summary>
/// Physical packing of olive oil. Tins are counts; bulk is loose litres.
/// </summary>
public sealed class OilPack
{
    public int Tin16 { get; set; }
    public int Tin17 { get; set; }
    public decimal BulkLitres { get; set; }

    public static OilPack Empty() => new();

    public OilPack Clone() => new()
    {
        Tin16 = Tin16,
        Tin17 = Tin17,
        BulkLitres = BulkLitres
    };
}
