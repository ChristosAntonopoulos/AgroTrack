using OliveLifecycle.Core.OilStock;

namespace OliveLifecycle.Core.Entities;

public class OilLotAllocation
{
    public string OilLotId { get; set; } = string.Empty;
    public OilPack Pack { get; set; } = OilPack.Empty();
}
