namespace OliveLifecycle.Core.OilStock;

public static class OilPackMath
{
    public const decimal Tin16Litres = 16m;
    public const decimal Tin17Litres = 17m;
    public const decimal KgPerLitre = 0.916m;

    public static decimal Round1(decimal value) => Math.Round(value, 1, MidpointRounding.AwayFromZero);

    public static decimal PackLitres(OilPack pack) =>
        Round1(pack.Tin16 * Tin16Litres + pack.Tin17 * Tin17Litres + pack.BulkLitres);

    public static decimal ToFarmerLitres(decimal totalAmount, string unit, decimal millKept, decimal? conversionFactor)
    {
        var factor = conversionFactor is > 0 ? conversionFactor.Value : KgPerLitre;
        var totalLitres = unit.Equals("litres", StringComparison.OrdinalIgnoreCase)
            ? totalAmount
            : totalAmount / factor;
        var keptLitres = unit.Equals("litres", StringComparison.OrdinalIgnoreCase)
            ? millKept
            : millKept / factor;
        return Round1(Math.Max(0, totalLitres - Math.Min(keptLitres, totalLitres)));
    }

    public static OilPack DefaultPackingFromFarmerLitres(decimal farmerLitres) =>
        new() { BulkLitres = Round1(Math.Max(0, farmerLitres)) };

    public static OilPack Add(OilPack a, OilPack b) => new()
    {
        Tin16 = a.Tin16 + b.Tin16,
        Tin17 = a.Tin17 + b.Tin17,
        BulkLitres = Round1(a.BulkLitres + b.BulkLitres)
    };

    public static OilPack Subtract(OilPack a, OilPack b) => new()
    {
        Tin16 = Math.Max(0, a.Tin16 - b.Tin16),
        Tin17 = Math.Max(0, a.Tin17 - b.Tin17),
        BulkLitres = Round1(Math.Max(0, a.BulkLitres - b.BulkLitres))
    };

    public static bool IsEmpty(OilPack pack) =>
        pack.Tin16 <= 0 && pack.Tin17 <= 0 && pack.BulkLitres <= 0.05m;

    public static OilPack Min(OilPack a, OilPack b) => new()
    {
        Tin16 = Math.Min(a.Tin16, b.Tin16),
        Tin17 = Math.Min(a.Tin17, b.Tin17),
        BulkLitres = Round1(Math.Min(a.BulkLitres, b.BulkLitres))
    };

    /// <summary>
    /// Greedy take of <paramref name="wanted"/> from <paramref name="available"/> without exceeding litres.
    /// </summary>
    public static OilPack Take(OilPack available, OilPack wanted, decimal availableLitres)
    {
        var take = new OilPack
        {
            Tin16 = Math.Min(available.Tin16, wanted.Tin16),
            Tin17 = Math.Min(available.Tin17, wanted.Tin17),
            BulkLitres = 0
        };
        var afterTins = availableLitres - take.Tin16 * Tin16Litres - take.Tin17 * Tin17Litres;
        take.BulkLitres = Round1(Math.Min(available.BulkLitres, Math.Min(wanted.BulkLitres, Math.Max(0, afterTins))));
        return take;
    }

    /// <summary>
    /// Move bulk litres into new 16L/17L tins inside one lot. Litres conserved.
    /// </summary>
    public static OilPack Repack(OilPack current, int addTin16, int addTin17)
    {
        var need = Round1(Math.Max(0, addTin16) * Tin16Litres + Math.Max(0, addTin17) * Tin17Litres);
        if (need > current.BulkLitres + 0.05m)
        {
            throw new InvalidOperationException("Not enough bulk oil to fill those tins.");
        }

        return new OilPack
        {
            Tin16 = current.Tin16 + Math.Max(0, addTin16),
            Tin17 = current.Tin17 + Math.Max(0, addTin17),
            BulkLitres = Round1(current.BulkLitres - need)
        };
    }

    public static bool IsFullyCovered(OilPack requested, OilPack delivered) =>
        delivered.Tin16 >= requested.Tin16
        && delivered.Tin17 >= requested.Tin17
        && delivered.BulkLitres + 0.05m >= requested.BulkLitres;

    public static OilPack Remaining(OilPack requested, OilPack delivered) =>
        Subtract(requested, delivered);
}
