using OliveLifecycle.Core.OilStock;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class OilPackMathTests
{
    [Fact]
    public void PackLitres_sums_tins_and_bulk()
    {
        var pack = new OilPack { Tin16 = 2, Tin17 = 1, BulkLitres = 4 };
        Assert.Equal(53m, OilPackMath.PackLitres(pack));
    }

    [Fact]
    public void Available_is_physical_minus_reserved()
    {
        var physical = new OilPack { Tin16 = 10 };
        var reserved = new OilPack { Tin16 = 2 };
        var pending = new OilPack { Tin16 = 3 };
        var held = OilPackMath.Add(reserved, pending);
        var available = OilPackMath.Subtract(physical, held);
        Assert.Equal(5, available.Tin16);
        Assert.Equal(80m, OilPackMath.PackLitres(available));
    }

    [Fact]
    public void Repack_moves_bulk_into_tins()
    {
        var current = new OilPack { BulkLitres = 100 };
        var next = OilPackMath.Repack(current, addTin16: 4, addTin17: 0);
        Assert.Equal(4, next.Tin16);
        Assert.Equal(36m, next.BulkLitres);
        Assert.Equal(100m, OilPackMath.PackLitres(next));
    }

    [Fact]
    public void Fifo_take_prefers_available_pack()
    {
        var available = new OilPack { Tin16 = 2, BulkLitres = 10 };
        var wanted = new OilPack { Tin16 = 3, BulkLitres = 5 };
        var take = OilPackMath.Take(available, wanted, OilPackMath.PackLitres(available));
        Assert.Equal(2, take.Tin16);
        Assert.Equal(5m, take.BulkLitres);
    }

    [Fact]
    public void Farmer_litres_from_kg_minus_mill_kept()
    {
        var litres = OilPackMath.ToFarmerLitres(137.4m, "kg", millKept: 0m, conversionFactor: 0.916m);
        Assert.True(litres > 149m && litres < 151m);
    }
}
